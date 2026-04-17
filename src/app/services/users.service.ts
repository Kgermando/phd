import { Injectable, inject, signal, computed } from '@angular/core';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from '../auth/services/auth.service';
import { User, UserResponse } from '../models/models';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  // Signaux pour l'état
  users = signal<UserResponse[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  userCount = computed(() => this.users().length);
  isOnline = computed(() => this.auth.isOnline());

  private usersSubject = new BehaviorSubject<UserResponse[]>([]);
  users$ = this.usersSubject.asObservable();

  /**
   * Récupérer tous les utilisateurs (en ligne uniquement)
   */
  async getAllUsers(forceRefresh: boolean = false): Promise<UserResponse[]> {
    this.loading.set(true);
    this.error.set(null);

    try {
      if (!this.auth.isOnline()) {
        this.error.set('Connexion requise pour accéder aux utilisateurs');
        this.loading.set(false);
        return [];
      }

      // Récupérer du backend
      const response = await firstValueFrom(this.api.getAllUsers());
      const users = response.data || [];

      this.users.set(users);
      this.usersSubject.next(users);
      return users;
    } catch (err: any) {
      const errorMsg = err.message || 'Erreur lors de la récupération des utilisateurs';
      this.error.set(errorMsg);
      return [];
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Récupérer les utilisateurs paginés (en ligne uniquement)
   */
  async getPaginatedUsers(
    page: number = 1,
    limit: number = 15,
    search: string = ''
  ): Promise<{
    data: UserResponse[];
    pagination: {
      total_records: number;
      total_pages: number;
      current_page: number;
      page_size: number;
    };
  }> {
    this.loading.set(true);
    this.error.set(null);

    try {
      if (!this.auth.isOnline()) {
        this.error.set('Connexion requise pour accéder aux utilisateurs');
        return { data: [], pagination: { total_records: 0, total_pages: 0, current_page: 1, page_size: limit } };
      }

      // Récupérer du backend
      const response = await firstValueFrom(this.api.getPaginatedUsers(page, limit, search));

      if (response.data) {
        this.users.set(response.data);
        this.usersSubject.next(response.data);
      }

      return {
        data: response.data || [],
        pagination: response.pagination,
      };
    } catch (err: any) {
      const errorMsg = err.message || 'Erreur lors de la récupération des utilisateurs';
      this.error.set(errorMsg);
      return { data: [], pagination: { total_records: 0, total_pages: 0, current_page: 1, page_size: limit } };
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Récupérer un utilisateur par UUID (en ligne uniquement)
   */
  async getUserByUuid(uuid: string): Promise<UserResponse | null> {
    this.error.set(null);

    try {
      if (!this.auth.isOnline()) {
        this.error.set('Connexion requise pour accéder aux utilisateurs');
        return null;
      }

      const response = await firstValueFrom(this.api.getUser(uuid));
      return response.data;
    } catch (err: any) {
      this.error.set(err.message);
      return null;
    }
  }

  /**
   * Créer un nouvel utilisateur (en ligne uniquement)
   */
  async createUser(userData: Partial<User>): Promise<{ success: boolean; user?: User; message: string }> {
    this.error.set(null);

    if (!this.auth.isOnline()) {
      return { success: false, message: 'Connexion requise pour créer un utilisateur.' };
    }

    try {
      const response = await firstValueFrom(this.api.createUser(userData));
      const user = response.data;

      if (user) {
        await this.getAllUsers();
      }

      return { success: true, user, message: response.message };
    } catch (err: any) {
      const errorMsg = err.message || 'Erreur lors de la création de l\'utilisateur';
      this.error.set(errorMsg);
      return { success: false, message: errorMsg };
    }
  }

  /**
   * Mettre à jour un utilisateur (en ligne uniquement)
   */
  async updateUser(uuid: string, userData: Partial<User>): Promise<{ success: boolean; user?: User; message: string }> {
    this.error.set(null);

    if (!this.auth.isOnline()) {
      return { success: false, message: 'Connexion requise pour modifier un utilisateur.' };
    }

    try {
      const response = await firstValueFrom(this.api.updateUser(uuid, userData));
      const user = response.data;

      if (user) {
        await this.getAllUsers();
      }

      return { success: true, user, message: response.message };
    } catch (err: any) {
      const errorMsg = err.message || 'Erreur lors de la mise à jour de l\'utilisateur';
      this.error.set(errorMsg);
      return { success: false, message: errorMsg };
    }
  }

  /**
   * Supprimer un utilisateur (en ligne uniquement)
   */
  async deleteUser(uuid: string): Promise<{ success: boolean; message: string }> {
    this.error.set(null);

    if (!this.auth.isOnline()) {
      return { success: false, message: 'Connexion requise pour supprimer un utilisateur.' };
    }

    try {
      await firstValueFrom(this.api.deleteUser(uuid));
      await this.getAllUsers();
      return { success: true, message: 'Utilisateur supprimé' };
    } catch (err: any) {
      const errorMsg = err.message || 'Erreur lors de la suppression de l\'utilisateur';
      this.error.set(errorMsg);
      return { success: false, message: errorMsg };
    }
  }

  /**
   * Synchroniser les utilisateurs depuis le backend
   */
  async syncUsersFromBackend(): Promise<boolean> {
    if (!this.auth.isOnline()) {
      this.error.set('Vous êtes hors ligne');
      return false;
    }

    try {
      await this.getAllUsers(true);
      return true;
    } catch (err: any) {
      this.error.set(err.message);
      return false;
    }
  }

  /**
   * Générer un UUID (implémentation simple)
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Nettoyer les erreurs
   */
  clearError(): void {
    this.error.set(null);
  }
}
