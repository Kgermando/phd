// =====================================================
// SYNC STATUS - Pour tracker l'état offline/online
// =====================================================

export interface SyncStatus {
  isSynced: boolean;
  lastSyncTime?: Date;
  pendingChanges: number;
  isOnline: boolean;
}
