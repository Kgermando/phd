import { Injectable, inject, signal, effect } from '@angular/core';
import { db, OfflineChange, LocalSession } from '../db/database';
import { ApiService } from './api.service';
import { AuthService } from '../auth/services/auth.service';


@Injectable({ providedIn: 'root' })
export class SyncService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  syncInProgress = signal<boolean>(false);
  lastSyncTime = signal<Date | null>(null);
  pendingChangesCount = signal<number>(0);

  constructor() {
    // Auto-sync quand le statut online change
    effect(() => {
      if (this.auth.isOnline() && !this.syncInProgress()) {
        this.syncAllPendingChanges();
      }
    });

    // Mettre à jour le compte des changements en attente
    effect(async () => {
      const pending = await db.offlineChanges.filter((change) => !change.synced).count();
      this.pendingChangesCount.set(pending);
    });
  }

  /**
   * Synchroniser tous les changements en attente
   */
  async syncAllPendingChanges(): Promise<{ success: boolean; synced: number; failed: number }> {
    if (this.syncInProgress() || !this.auth.isOnline()) {
      return { success: false, synced: 0, failed: 0 };
    }

    this.syncInProgress.set(true);

    try {
      const pendingChanges = await db.offlineChanges.filter((change) => !change.synced).toArray();

      let synced = 0;
      let failed = 0;

      for (const change of pendingChanges) {
        try {
          await this.syncChange(change);
          await db.offlineChanges.update(change.id!, { synced: true });
          synced++;
        } catch (error) {
          console.error('Erreur lors de la synchronisation du changement:', error);
          failed++;
        }
      }

      this.lastSyncTime.set(new Date());
      this.auth.syncStatus.update((status: any) => ({
        ...status,
        isSynced: synced > 0,
        lastSyncTime: new Date(),
        pendingChanges: failed,
      }));

      return { success: synced > 0 || failed === 0, synced, failed };
    } finally {
      this.syncInProgress.set(false);
    }
  }

  /**
   * Synchroniser un changement individual
   */
  private async syncChange(change: OfflineChange): Promise<void> {
    const token = this.auth.currentToken();

    if (!token) {
      throw new Error('Token non disponible pour la synchronisation');
    }

    switch (change.entity) {
      case 'producer':
        await this.syncProducerChange(change, token);
        break;
      case 'champs':
        // À implémenter selon les endpoints du backend pour les champs
        console.warn('Synchronisation des champs à implémenter');
        break;
      default:
        throw new Error(`Type d'entité inconnu: ${change.entity}`);
    }
  }

  /**
   * Synchroniser les changements producteur
   * À implémenter selon les endpoints du backend
   */
  private async syncProducerChange(change: OfflineChange, token: string): Promise<void> {
    // À implémenter selon les endpoints du backend pour les producteurs
    console.warn('Synchronisation des producteurs à implémenter');
  }

  /**
   * Forcer une synchronisation manuelle
   */
  async forceSyncAll(): Promise<{ success: boolean; synced: number; failed: number }> {
    if (!this.auth.isOnline()) {
      throw new Error('Vous êtes hors ligne. Impossible de synchroniser.');
    }

    return this.syncAllPendingChanges();
  }

  /**
   * Synchroniser les producteurs depuis le backend
   * À adapter selon les endpoints du backend
   */
  async syncProducersFromBackend(): Promise<any[]> {
    try {
      // À implémenter selon les endpoints du backend
      console.warn('Synchronisation des producteurs à implémenter');
      return [];
    } catch (error) {
      console.error('Erreur lors de la synchronisation des producteurs:', error);
      throw error;
    }
  }

  /**
   * Ajouter un changement en attente de synchronisation
   */
  async addPendingChange(type: 'create' | 'update' | 'delete', entity: 'producer' | 'champs', data: any): Promise<void> {
    if (!this.auth.isOnline()) {
      await db.offlineChanges.add({
        type,
        entity,
        entityUUID: data.uuid ?? '',
        timestamp: new Date(),
        data,
        synced: false,
        syncAttempts: 0,
      });

      this.pendingChangesCount.update((count) => count + 1);
    }
  }

  /**
   * Récupérer le statut de synchronisation
   */
  getSyncStatus() {
    return {
      isOnline: this.auth.isOnline(),
      syncInProgress: this.syncInProgress(),
      pendingChanges: this.pendingChangesCount(),
      lastSyncTime: this.lastSyncTime(),
      isSynced: this.auth.syncStatus().isSynced,
    };
  }

  /**
   * Récupérer les changements en attente
   */
  async getPendingChanges(): Promise<OfflineChange[]> {
    return db.offlineChanges.filter((change) => !change.synced).toArray();
  }

  /**
   * Nettoyer les changements synchronisés
   */
  async cleanupSyncedChanges(daysOld: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const deleted = await db.offlineChanges
      .filter((change) => change.synced && change.timestamp < cutoffDate)
      .delete();

    return deleted;
  }
}
