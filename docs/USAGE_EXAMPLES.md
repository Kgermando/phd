# Guide d'utilisation des nouveaux services

## Exemple : Composant Utilisateurs

Voici comment mettre à jour vos composants existants pour utiliser les nouveaux services.

### Avant (ancien code)

```typescript
export class UsersListComponent {
  private auth = inject(AuthService);
  users: User[] = [];
  
  async ngOnInit() {
    const id = sessionStorage.getItem('userId');
    const user = await db.users.get(Number(id));
    // ...
  }
}
```

### Après (nouveau code)

```typescript
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserResponse } from '../../models/models';
import { UsersService } from '../../services/users.service';
import { AuthService } from '../../auth/services/auth.service';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Afficher le statut de connexion -->
    <div class="status-bar">
      <span *ngIf="auth.isOnline()">En ligne ✓</span>
      <span *ngIf="!auth.isOnline()">Hors ligne ⚠️</span>
      <span *ngIf="syncStatus.pendingChanges > 0">
        {{ syncStatus.pendingChanges }} changements en attente
      </span>
    </div>

    <!-- Liste des utilisateurs -->
    <div *ngIf="users().length > 0" class="users-list">
      <div *ngFor="let user of users()" class="user-card">
        <h3>{{ user.fullname }}</h3>
        <p>{{ user.email }}</p>
        <p>Rôle: {{ user.role }}</p>
      </div>
    </div>

    <!-- Chargement -->
    <div *ngIf="usersService.loading()">Chargement...</div>

    <!-- Erreur -->
    <div *ngIf="usersService.error()" class="error">
      {{ usersService.error() }}
    </div>
  `,
})
export class UsersListComponent {
  readonly auth = inject(AuthService);
  readonly usersService = inject(UsersService);

  users = this.usersService.users;
  syncStatus = computed(() => this.auth.syncStatus());

  async ngOnInit() {
    // Charger les utilisateurs
    // Online: récupère du backend et met en cache
    // Offline: récupère du cache local
    await this.usersService.getAllUsers();
  }

  // Forcer la synchronisation manuelle (si online)
  async syncNow() {
    if (this.auth.isOnline()) {
      await this.usersService.syncUsersFromBackend();
    }
  }
}
```

---

## Exemple : Créer un nouvel utilisateur

### Composant de formulaire

```typescript
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { UsersService } from '../../services/users.service';
import { AuthService } from '../../auth/services/auth.service';
import { User } from '../../models/models';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="userForm" (ngSubmit)="onSubmit()">
      <div>
        <label>Nom complet</label>
        <input formControlName="fullname" />
      </div>

      <div>
        <label>Email</label>
        <input formControlName="email" type="email" />
      </div>

      <div>
        <label>Téléphone</label>
        <input formControlName="telephone" />
      </div>

      <div>
        <label>Rôle</label>
        <select formControlName="role">
          <option value="Agent">Agent</option>
          <option value="Directeur">Directeur</option>
          <option value="Secretaire">Secrétaire</option>
        </select>
      </div>

      <div>
        <label>Mot de passe</label>
        <input formControlName="password" type="password" />
      </div>

      <div>
        <label>Confirmer mot de passe</label>
        <input formControlName="password_confirm" type="password" />
      </div>

      <button type="submit" [disabled]="submitting()">
        {{ submitting() ? 'Création...' : 'Créer utilisateur' }}
      </button>
    </form>

    <div *ngIf="usersService.error()" class="error">
      {{ usersService.error() }}
    </div>

    <!-- Message hors ligne -->
    <div *ngIf="!auth.isOnline()" class="info">
      Mode hors ligne - L'utilisateur sera créé localement et synchronisé à la reconnexion
    </div>
  `,
})
export class UserFormComponent {
  private fb = inject(FormBuilder);
  readonly auth = inject(AuthService);
  readonly usersService = inject(UsersService);

  userForm = this.fb.group({
    fullname: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    telephone: ['', Validators.required],
    role: ['Agent', Validators.required],
    permission: [''],
    password: ['', [Validators.required, Validators.minLength(6)]],
    password_confirm: ['', Validators.required],
  });

  submitting = signal(false);

  async onSubmit() {
    if (this.userForm.invalid) return;

    this.submitting.set(true);

    const userData: Partial<User> = {
      ...this.userForm.value,
      uuid: this.generateUUID(),
      status: true,
    };

    const result = await this.usersService.createUser(userData);

    this.submitting.set(false);

    if (result.success) {
      // Succès - réinitialiser le formulaire
      this.userForm.reset();
      // Redirection, notification, etc.
    }
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
```

---

## Exemple : Mettre à jour un utilisateur

```typescript
export class UserEditComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);

  user = signal<UserResponse | null>(null);
  loading = signal(false);
  updateForm!: FormGroup;

  async ngOnInit() {
    this.loading.set(true);

    const uuid = this.activatedRoute.snapshot.paramMap.get('uuid');
    if (uuid) {
      const user = await this.usersService.getUserByUuid(uuid);
      if (user) {
        this.user.set(user);
        this.buildForm(user);
      }
    }

    this.loading.set(false);
  }

  private buildForm(user: UserResponse) {
    this.updateForm = new FormGroup({
      fullname: new FormControl(user.fullname, Validators.required),
      email: new FormControl(user.email, [Validators.required, Validators.email]),
      telephone: new FormControl(user.telephone, Validators.required),
      status: new FormControl(user.status),
    });
  }

  async onUpdate() {
    if (this.updateForm.invalid) return;

    const uuid = this.user()?.uuid;
    if (!uuid) return;

    const result = await this.usersService.updateUser(uuid, this.updateForm.value);

    if (result.success) {
      // Succès
      this.router.navigate(['/users']);
    }
  }
}
```

---

## Exemple : Supprimer un utilisateur

```typescript
async deleteUser(uuid: string) {
  if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur?')) {
    const result = await this.usersService.deleteUser(uuid);

    if (result.success) {
      // Succès - recharger la liste
      await this.usersService.getAllUsers();
    } else {
      alert('Erreur: ' + result.message);
    }
  }
}
```

---

## Exemple : Récupérer les utilisateurs avec pagination

```typescript
export class UsersPaginatedComponent {
  private usersService = inject(UsersService);

  users = signal<UserResponse[]>([]);
  pagination = signal({
    current_page: 1,
    total_pages: 1,
    total_records: 0,
    page_size: 15,
  });
  search = signal('');
  loading = signal(false);

  async loadUsers(page: number = 1, search: string = '') {
    this.loading.set(true);

    const { data, pagination } = await this.usersService.getPaginatedUsers(
      page,
      15,
      search
    );

    this.users.set(data);
    this.pagination.set(pagination);
    this.loading.set(false);
  }

  async onSearch(searchTerm: string) {
    this.search.set(searchTerm);
    await this.loadUsers(1, searchTerm);
  }

  async nextPage() {
    const nextPage = this.pagination().current_page + 1;
    if (nextPage <= this.pagination().total_pages) {
      await this.loadUsers(nextPage, this.search());
    }
  }

  async previousPage() {
    const prevPage = this.pagination().current_page - 1;
    if (prevPage > 0) {
      await this.loadUsers(prevPage, this.search());
    }
  }

  ngOnInit() {
    this.loadUsers();
  }
}
```

---

## Guide d'intégration des services existants

### 1. **Composant Dashboard**

```typescript
export class DashboardComponent {
  readonly auth = inject(AuthService);
  readonly sync = inject(SyncService);

  connectionStatus = computed(() => ({
    isOnline: this.auth.isOnline(),
    pendingChanges: this.sync.getSyncStatus().pendingChanges,
  }));

  async ngOnInit() {
    if (this.auth.isOnline()) {
      // Forcer la synchronisation des données au démarrage
      await this.sync.forceSyncAll();
    }
  }
}
```

### 2. **Injector dans les services existants**

```typescript
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { UsersService } from './users.service';

@Injectable({ providedIn: 'root' })
export class ProducersService {
  private auth = inject(AuthService);
  private users = inject(UsersService);

  async getProducersForAgent() {
    const user = this.auth.currentUser();
    if (!user) return [];

    // Utiliser les nouvelles données utilisateur
    return this.api.getProducersForUser(user.uuid);
  }
}
```

### 3. **Gestion des erreurs**

```typescript
async createEntity(data: any) {
  try {
    const result = await this.usersService.createUser(data);
    
    if (!result.success) {
      // Afficher l'erreur
      this.showError(result.message);
    }
  } catch (error) {
    // Erreur non gérée
    this.showError('Une erreur est survenue');
  }
}
```

---

## Points clés à retenir

✅ **Utilisez les signaux** pour réactif
✅ **Utilisez les computed()** pour les valeurs dérivées
✅ **Utilisez async/await** pour les opérations
✅ **Vérifiez isOnline()** avant les ops critiques
✅ **Afficher el statut de sync** à l'utilisateur
✅ **Gérer les erreurs** gracieusement
✅ **Utiliser forceRefresh** quand nécessaire

---

## Migration par étape

1. Créer les tests unitaires
2. Mettre à jour les composants existants
3. Tester offline/online
4. Déployer en staging
5. Déployer en production

---

Pour plus de détails, consultez:
- `MIGRATION.md` - Guide général
- `BACKEND_INTEGRATION.md` - Configuration backend
- Fichiers des services pour l'API complète
