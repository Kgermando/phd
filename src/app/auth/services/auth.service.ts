import { inject, Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { db, LocalSession } from '../../db/database';
import { User, UserResponse, LoginRequest, SyncStatus } from '../../models/models';
import { AuthApiService } from './auth-api.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);
  private readonly authApi = inject(AuthApiService);

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
   * Connexion en ligne (avec le backend Go)
   */
  async loginOnline(loginData: LoginRequest): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.authApi.login(loginData).toPromise();

      if (response?.data) {
        // Sauvegarder le token
        const token = response.data;
        this.currentToken.set(token);
        localStorage.setItem('auth_token', token);

        // Récupérer les infos utilisateur
        const userResponse = await this.authApi.getAuthenticatedUser(token).toPromise();

        if (userResponse) {
          this.currentUser.set(userResponse);
          localStorage.setItem('current_user', JSON.stringify(userResponse));

          // Sauvegarder dans la DB locale pour offline
          await this.saveUserToLocalSession(userResponse, token);

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

      // Vérifier le mot de passe
      if (user.isActive && this.verifyOfflinePassword(password, user.uuid)) {
        // Retrouver les infos complètes depuis le localStorage
        const rawUser = localStorage.getItem(`user_cache_${user.uuid}`);
        const fullUser: UserResponse | null = rawUser ? JSON.parse(rawUser) : null;

        if (fullUser) {
          this.currentUser.set(fullUser as UserResponse);
          this.currentToken.set(user.token || '');
          return { success: true, message: 'Connexion hors ligne réussie' };
        }
      }

      return { success: false, message: 'Identifiant ou mot de passe incorrect' };
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
        localStorage.setItem('current_user', JSON.stringify(response.data));
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
    try {
      if (this.isOnline() && this.currentToken()) {
        await this.authApi.logout().toPromise();
      }
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      this.currentUser.set(null);
      this.currentToken.set(null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('current_user');
      this.router.navigate(['/auth/login']);
    }
  }

  /**
   * Restaurer la session depuis le stockage local
   */
  async restoreSession(): Promise<void> {
    try {
      const token = localStorage.getItem('auth_token');
      const userJson = localStorage.getItem('current_user');

      if (token && userJson) {
        this.currentToken.set(token);
        const user = JSON.parse(userJson) as UserResponse;
        this.currentUser.set(user);

        // Si en ligne, valider le token avec le backend
        if (this.isOnline()) {
          try {
            const validatedUser = await this.authApi.getAuthenticatedUser(token).toPromise();
            if (validatedUser) {
              this.currentUser.set(validatedUser);
              localStorage.setItem('current_user', JSON.stringify(validatedUser));
            }
          } catch (error) {
            console.warn('Token invalide, utilisation de la session locale');
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors de la restauration de session:', error);
    }
  }

  /**
   * Sauvegarder l'utilisateur dans la DB locale pour accès offline
   */
  private async saveUserToLocalSession(user: UserResponse, token: string): Promise<void> {
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
        lastLoginTime: new Date(),
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
   * Vérifier le mot de passe en mode offline
   */
  private verifyOfflinePassword(inputPassword: string, uuid: string): boolean {
    // Implémentation simple - À remplacer par bcrypt en production
    const storedPassword = sessionStorage.getItem(`offline_pwd_${uuid}`);
    return storedPassword === inputPassword;
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
