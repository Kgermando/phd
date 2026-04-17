import Dexie, { Table } from 'dexie';
import { Producer, Champs, SyncStatus } from '../models/models';

// Interface pour tracker les changements offline
export interface OfflineChange {
  id?: number;
  uuid?: string;
  type: 'create' | 'update' | 'delete';
  entity: 'producer' | 'champs';
  entityUUID: string;
  timestamp: Date;
  data: any;
  synced: boolean;
  syncAttempts: number;
  lastSyncError?: string;
}

// Interface pour stocker les sessions utilisateur offline
export interface LocalSession {
  id?: number;
  uuid: string;
  email: string;
  telephone: string;
  fullname: string;
  role: string;
  permission: string;
  status: boolean;
  token?: string;
  lastLoginTime: Date;
  isActive: boolean;
}

// Interface pour tracker les producteurs synchronisés
export interface SyncedProducer {
  id?: number;
  producer_uuid: string;
  lastSyncedAt: Date;
  lastModifiedAt: Date;
  syncStatus: 'synced' | 'pending' | 'conflict';
  checksum?: string;
}

export class AppDatabase extends Dexie {
  producers!: Table<Producer, string>; // UUID as primary key
  champs!: Table<Champs, string>; // UUID as primary key
  offlineChanges!: Table<OfflineChange, number>;
  localSessions!: Table<LocalSession, number>;
  syncedProducers!: Table<SyncedProducer, number>;

  constructor() {
    super('RiziculteursDB');
    
    // Version 1 - initial schema (deprecated)
    this.version(1).stores({
      producers: '++id, nom, village, groupement, zone',
      champs: '++id',
      offlineChanges: '++id, entity, timestamp, synced',
      localSessions: '++id, uuid, lastLoginTime, isActive',
      syncedProducers: '++id, producer_uuid',
    });

    // Version 2 - added indices
    this.version(2).stores({
      producers: '++id, nom, village, groupement, zone, sexe',
      champs: '++id',
      offlineChanges: '++id, entity, timestamp, synced',
      localSessions: '++id, uuid, lastLoginTime, isActive',
      syncedProducers: '++id, producer_uuid',
    });

    // Version 3 - changed to UUID-based schema
    this.version(3)
      .stores({
        producers: '&uuid, zone, village, agent_recenseur_uuid',
        champs: '&uuid, producer_uuid',
        offlineChanges: '++id, entity, entityUUID, synced, timestamp',
        localSessions: '++id, &uuid, lastLoginTime, isActive',
        syncedProducers: '++id, &producer_uuid, lastSyncedAt',
      })
      .upgrade(async (tx) => {
        // Clear old data when upgrading to UUID-based schema
        try {
          await tx.table('producers').clear();
          await tx.table('champs').clear();
          await tx.table('offlineChanges').clear();
          await tx.table('localSessions').clear();
          await tx.table('syncedProducers').clear();
        } catch (e) {
          console.warn('Error clearing tables during upgrade:', e);
        }
      });
  }

  /**
   * Ajouter un changement offline à tracker
   */
  async addOfflineChange(
    type: 'create' | 'update' | 'delete',
    entity: 'producer' | 'champs',
    entityUUID: string,
    data: any
  ): Promise<void> {
    await this.offlineChanges.add({
      type,
      entity,
      entityUUID,
      timestamp: new Date(),
      data,
      synced: false,
      syncAttempts: 0,
    });
  }

  /**
   * Récupérer les changements en attente de sync
   */
  async getPendingChanges(): Promise<OfflineChange[]> {
    return this.offlineChanges.filter((change) => !change.synced).toArray();
  }

  /**
   * Marquer un changement comme synchronisé
   */
  async markChangeAsSynced(changeId: number): Promise<void> {
    await this.offlineChanges.update(changeId, { synced: true });
  }

  /**
   * Mettre à jour le statut de sync d'un producteur
   */
  async updateProducerSyncStatus(
    producer_uuid: string,
    status: 'synced' | 'pending' | 'conflict'
  ): Promise<void> {
    const existing = await this.syncedProducers.where('producer_uuid').equals(producer_uuid).first();

    if (existing) {
      await this.syncedProducers.update(existing.id!, {
        syncStatus: status,
        lastModifiedAt: new Date(),
      });
    } else {
      await this.syncedProducers.add({
        producer_uuid,
        syncStatus: status,
        lastSyncedAt: new Date(),
        lastModifiedAt: new Date(),
      });
    }
  }

  /**
   * Nettoyer les changements synchronisés anciens
   */
  async cleanupSyncedChanges(daysOld: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const changestoDelete = await this.offlineChanges
      .filter((change) => change.synced && change.timestamp < cutoffDate)
      .toArray();

    for (const change of changestoDelete) {
      if (change.id) await this.offlineChanges.delete(change.id);
    }

    return changestoDelete.length;
  }
}

export const db = new AppDatabase();
