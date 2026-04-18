import { inject, Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { db, LocalSession } from '../../db/database';
import { User, UserResponse, LoginRequest, SyncStatus } from '../../models/models';
import { AuthApiService } from './auth-api.service';
import { environment } from '../../../environments/environment';

const SESSION_DURATION_MS = environment.auth.tokenExpiresIn;
const TOKEN_KEY = environment.auth.tokenStorageKey;
const USER_KEY = environment.auth.userStorageKey;
const LOGIN_TIME_KEY = `${TOKEN_KEY}_login_time`;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);
  private readonly authApi = inject(AuthApiService);

  private expiryTimer: ReturnType<typeof setTimeout> | null = null;

  // Signaux pour l'état d'authentification
  currentUser = signal<UserResponse | null>(null);
  currentToken = signal<string | null>(null);
  isOnline = signal<boolean>(navigator.onLine);
  syncStatus = signal<SyncStatus>({
    isSynced: true,
    lastSyncTime: undefined,
    pendingChanges: 0,
    isOnline: navigator.onLine,
  });

  isLoggedIn = computed(() => this.currentUser() !== null);
  canUseOfflineMode = computed(() => {
    const user = this.currentUser();
    return user !== null && !this.isOnline();
  });

  /** Permission helpers — read < write < all */
  canCreate = computed(() => {
    const p = this.currentUser()?.permission;
    return p === 'write' || p === 'all';
  });
  canEdit = computed(() => this.currentUser()?.permission === 'all');
  canDelete = computed(() => this.currentUser()?.permission === 'all');

  constructor() {
    // Écouter les changements de connectivité
    window.addEventListener('online', () => {
      this.isOnline.set(true);
      this.syncStatus.update((status) => ({ ...status, isOnline: true }));
    });

    window.addEventListener('offline', () => {
      this.isOnline.set(false);
      this.syncStatus.update((status) => ({ ...status, isOnline: false }));
    });
  }

  /**
   * Détermine si la session enregistrée a dépassé 24h
   */
  private isSessionExpired(loginTime: Date): boolean {
    return Date.now() - loginTime.getTime() > SESSION_DURATION_MS;
  }

  /**
   * Démarre un minuteur qui force la déconnexion à l'expiration exacte de la session.
   * Fonctionne même hors ligne.
   */
  private startExpiryWatcher(loginTime: Date): void {
    if (this.expiryTimer !== null) {
      clearTimeout(this.expiryTimer);
    }
    const remaining = SESSION_DURATION_MS - (Date.now() - loginTime.getTime());
    if (remaining <= 0) {
      this.logout();
      return;
    }
    this.expiryTimer = setTimeout(() => this.logout(), remaining);
  }

  /**
   * Hash le mot de passe via PBKDF2 (Web Crypto) avec l'UUID comme sel.
   */
  private async hashPassword(password: string, salt: string): Promise<string> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 100_000 },
      keyMaterial,
      256
    );
    return Array.from(new Uint8Array(bits))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Connexion en ligne (avec le backend Go)
   */
  async loginOnline(loginData: LoginRequest): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.authApi.login(loginData).toPromise();

      if (response?.data) {
        // Sauvegarder le token
        const token = response.data;
        this.currentToken.set(token);
        localStorage.setItem(TOKEN_KEY, token);

        // Récupérer les infos utilisateur
        const userResponse = await this.authApi.getAuthenticatedUser(token).toPromise();

        if (userResponse) {
          const loginTime = new Date();
          this.currentUser.set(userResponse);
          localStorage.setItem(USER_KEY, JSON.stringify(userResponse));
          localStorage.setItem(LOGIN_TIME_KEY, loginTime.toISOString());

          // Hash du mot de passe pour l'accès offline
          const passwordHash = await this.hashPassword(loginData.password, userResponse.uuid);

          // Sauvegarder dans la DB locale pour offline
          await this.saveUserToLocalSession(userResponse, token, loginTime, passwordHash);

          // Démarrer le minuteur d'expiration
          this.startExpiryWatcher(loginTime);

          return { success: true, message: 'Connexion réussie' };
        }
      }

      return { success: false, message: 'Erreur lors de la récupération des données utilisateur' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Erreur de connexion' };
    }
  }

  /**
   * Connexion hors ligne (avec IndexedDB)
   */
  async loginOffline(identifier: string, password: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await db.localSessions
        .where('email')
        .equals(identifier)
        .or('telephone')
        .equals(identifier)
        .first();

      if (!user) {
        return { success: false, message: 'Utilisateur non trouvé. Veuillez vous connecter une première fois en ligne.' };
      }

      // Vérifier l'expiration de la session (24h)
      if (!user.loginTime || this.isSessionExpired(new Date(user.loginTime))) {
        return {
          success: false,
          message: 'Votre session a expiré (24h). Veuillez vous reconnecter en ligne.',
        };
      }

      // Vérifier le mot de passe via hash PBKDF2
      if (!user.passwordHash) {
        return { success: false, message: 'Données offline incomplètes. Veuillez vous connecter en ligne.' };
      }

      const inputHash = await this.hashPassword(password, user.uuid);
      if (inputHash !== user.passwordHash) {
        return { success: false, message: 'Identifiant ou mot de passe incorrect' };
      }

      if (!user.isActive) {
        return { success: false, message: 'Compte inactif' };
      }

      // Retrouver les infos complètes depuis le localStorage
      const rawUser = localStorage.getItem(`user_cache_${user.uuid}`);
      const fullUser: UserResponse | null = rawUser ? JSON.parse(rawUser) : null;

      if (fullUser) {
        const loginTime = new Date(user.loginTime);
        this.currentUser.set(fullUser as UserResponse);
        this.currentToken.set(user.token || '');
        this.startExpiryWatcher(loginTime);
        return { success: true, message: 'Connexion hors ligne réussie' };
      }

      return { success: false, message: 'Données utilisateur introuvables. Veuillez vous connecter en ligne.' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Erreur de connexion hors ligne' };
    }
  }

  /**
   * Méthode principale de connexion (online/offline)
   */
  async login(loginData: LoginRequest): Promise<{ success: boolean; message: string }> {
    if (this.isOnline()) {
      return this.loginOnline(loginData);
    } else {
      return this.loginOffline(loginData.identifier, loginData.password);
    }
  }

  /**
   * Inscription d'un nouvel utilisateur
   */
  async register(userData: Partial<User>): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      if (!this.isOnline()) {
        return { success: false, message: 'Vous devez être en ligne pour vous inscrire' };
      }

      const response = await this.authApi.register(userData).toPromise();

      if (response?.data) {
        return { success: true, message: response.message, user: response.data };
      }

      return { success: false, message: 'Erreur lors de l\'inscription' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Erreur d\'inscription' };
    }
  }

  /**
   * Demande de réinitialisation de mot de passe
   */
  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isOnline()) {
        return { success: false, message: 'Vous devez être en ligne pour réinitialiser votre mot de passe' };
      }

      const response = await this.authApi.forgotPassword({ email }).toPromise();
      return { success: true, message: response?.message || 'Email de réinitialisation envoyé' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Erreur lors de la demande de réinitialisation' };
    }
  }

  /**
   * Vérifier la validité du token de réinitialisation
   */
  async verifyResetToken(token: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isOnline()) {
        return { success: false, message: 'Connexion internet requise' };
      }

      const response = await this.authApi.verifyResetToken(token).toPromise();
      return { success: response?.valid || false, message: response?.message || '' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Token invalide' };
    }
  }

  /**
   * Réinitialiser le mot de passe
   */
  async resetPassword(token: string, newPassword: string, confirmPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isOnline()) {
        return { success: false, message: 'Connexion internet requise' };
      }

      if (newPassword !== confirmPassword) {
        return { success: false, message: 'Les mots de passe ne correspondent pas' };
      }

      const response = await this.authApi.resetPassword(token, {
        password: newPassword,
        password_confirm: confirmPassword,
      }).toPromise();

      return { success: true, message: response?.message || 'Mot de passe réinitialisé avec succès' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Erreur lors de la réinitialisation' };
    }
  }

  /**
   * Changer le mot de passe connecté
   */
  async changePassword(oldPassword: string, newPassword: string, confirmPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isOnline()) {
        return { success: false, message: 'Vous devez être en ligne pour changer votre mot de passe' };
      }

      if (newPassword !== confirmPassword) {
        return { success: false, message: 'Les mots de passe ne correspondent pas' };
      }

      const response = await this.authApi.changePassword({
        old_password: oldPassword,
        password: newPassword,
        password_confirm: confirmPassword,
      }).toPromise();

      return { success: true, message: response?.message || 'Mot de passe changé avec succès' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Erreur lors du changement de mot de passe' };
    }
  }

  /**
   * Mettre à jour les informations profil
   */
  async updateProfile(profileData: any): Promise<{ success: boolean; message: string; user?: UserResponse }> {
    try {
      if (!this.isOnline()) {
        return { success: false, message: 'Vous devez être en ligne pour mettre à jour votre profil' };
      }

      const response = await this.authApi.updateUserInfo(profileData).toPromise();

      if (response?.data) {
        this.currentUser.set(response.data as UserResponse);
        localStorage.setItem(USER_KEY, JSON.stringify(response.data));
        return { success: true, message: response.message, user: response.data };
      }

      return { success: false, message: 'Erreur lors de la mise à jour' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Erreur lors de la mise à jour du profil' };
    }
  }

  /**
   * Déconnexion
   */
  async logout(): Promise<void> {
    // Annuler le minuteur d'expiration
    if (this.expiryTimer !== null) {
      clearTimeout(this.expiryTimer);
      this.expiryTimer = null;
    }

    try {
      if (this.isOnline() && this.currentToken()) {
        await this.authApi.logout().toPromise();
      }
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      this.currentUser.set(null);
      this.currentToken.set(null);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(LOGIN_TIME_KEY);
      this.router.navigate(['/auth/login']);
    }
  }

  /**
   * Restaurer la session depuis le stockage local
   */
  async restoreSession(): Promise<void> {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const userJson = localStorage.getItem(USER_KEY);
      const loginTimeRaw = localStorage.getItem(LOGIN_TIME_KEY);

      if (!token || !userJson || !loginTimeRaw) {
        return;
      }

      const loginTime = new Date(loginTimeRaw);

      // Forcer la déconnexion si la session a expiré (24h)
      if (this.isSessionExpired(loginTime)) {
        this.currentUser.set(null);
        this.currentToken.set(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(LOGIN_TIME_KEY);
        return;
      }

      this.currentToken.set(token);
      const user = JSON.parse(userJson) as UserResponse;
      this.currentUser.set(user);

      // Démarrer le minuteur pour l'expiration restante
      this.startExpiryWatcher(loginTime);

      // Si en ligne, valider le token avec le backend
      if (this.isOnline()) {
        try {
          const validatedUser = await this.authApi.getAuthenticatedUser(token).toPromise();
          if (validatedUser) {
            this.currentUser.set(validatedUser);
            localStorage.setItem(USER_KEY, JSON.stringify(validatedUser));
          }
        } catch (error) {
          console.warn('Token invalide, utilisation de la session locale');
        }
      }
    } catch (error) {
      console.error('Erreur lors de la restauration de session:', error);
    }
  }

  /**
   * Sauvegarder l'utilisateur dans la DB locale pour accès offline
   */
  private async saveUserToLocalSession(
    user: UserResponse,
    token: string,
    loginTime: Date,
    passwordHash: string
  ): Promise<void> {
    try {
      const session: LocalSession = {
        uuid: user.uuid,
        email: user.email,
        telephone: user.telephone,
        fullname: user.fullname,
        role: user.role,
        permission: user.permission,
        status: user.status,
        token,
        lastLoginTime: loginTime,
        loginTime,
        passwordHash,
        isActive: true,
      };

      await db.localSessions.put(session);
      // Mettre en cache l'utilisateur dans le localStorage
      localStorage.setItem(`user_cache_${user.uuid}`, JSON.stringify(user));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la session locale:', error);
    }
  }

  /**
   * Obtenir le header d'authentification
   */
  getAuthHeader(): { Authorization: string } | {} {
    const token = this.currentToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Vérifier si l'utilisateur a une permission
   */
  hasPermission(permission: string): boolean {
    const user = this.currentUser();
    return user?.permission?.includes(permission) || false;
  }

  /**
   * Vérifier si l'utilisateur a un rôle
   */
  hasRole(role: string): boolean {
    const user = this.currentUser();
    return user?.role === role;
  }
}
