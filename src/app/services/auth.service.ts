import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { db } from '../db/database';
import { User } from '../models/models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);

  currentUser = signal<User | null>(null);

  async login(username: string, password: string): Promise<boolean> {
    const user = await db.users.where('username').equals(username).first();
    if (user && user.password === password) {
      this.currentUser.set(user);
      sessionStorage.setItem('userId', String(user.id));
      return true;
    }
    return false;
  }

  logout(): void {
    this.currentUser.set(null);
    sessionStorage.removeItem('userId');
    this.router.navigate(['/login']);
  }

  async restoreSession(): Promise<void> {
    const id = sessionStorage.getItem('userId');
    if (id) {
      const user = await db.users.get(Number(id));
      if (user) this.currentUser.set(user);
    }
  }

  isLoggedIn(): boolean {
    return this.currentUser() !== null;
  }
}
