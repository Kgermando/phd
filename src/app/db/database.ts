import Dexie, { Table } from 'dexie';
import { Producer, User } from '../models/models';

export class AppDatabase extends Dexie {
  producers!: Table<Producer, number>;
  users!: Table<User, number>;

  constructor() {
    super('RiziculteursDB');
    this.version(1).stores({
      producers: '++id, nom, village, groupement, zone, sexe, agentRecenseurId',
      users: '++id, &username, role',
    });
  }
}

export const db = new AppDatabase();
