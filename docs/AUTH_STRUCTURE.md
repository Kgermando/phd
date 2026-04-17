# Structure Auth - Guide complet

## 📁 Hiérarchie des fichiers

```
src/app/auth/
├── services/
│   ├── auth.service.ts          # Service principal d'authentification
│   └── auth-api.service.ts      # Service d'appels HTTP API
├── components/
│   ├── login/
│   │   ├── login.ts             # Composant connexion
│   │   ├── login.html           # Template connexion
│   │   └── login.scss           # Styles connexion
│   ├── forgot-password/
│   │   ├── forgot-password.ts   # Composant oubli de mot de passe
│   │   ├── forgot-password.html # Template oubli
│   │   └── forgot-password.scss # Styles oubli
│   └── reset-password/
│       ├── reset-password.ts    # Composant réinitialisation
│       ├── reset-password.html  # Template réinitialisation
│       └── reset-password.scss  # Styles réinitialisation
├── auth.routes.ts               # Routes d'authentification
└── index.ts                      # Fichier barrel (exports)
```

## 🔐 Services d'authentification

### AuthService (`services/auth.service.ts`)

Service principal gérant toute la logique d'authentification (online/offline).

**Méthodes principales:**

```typescript
// Connexion
async login(loginData: LoginRequest): Promise<{ success: boolean; message: string }>

// Inscription
async register(userData: Partial<User>): Promise<{ success: boolean; message: string; user?: User }>

// Mot de passe oublié
async forgotPassword(email: string): Promise<{ success: boolean; message: string }>

// Vérifier token réinitialisation
async verifyResetToken(token: string): Promise<{ success: boolean; message: string }>

// Réinitialiser mot de passe
async resetPassword(token: string, newPassword: string, confirmPassword: string): Promise<{ success: boolean; message: string }>

// Changer mot de passe (utilisateur connecté)
async changePassword(oldPassword: string, newPassword: string, confirmPassword: string): Promise<{ success: boolean; message: string }>

// Mise à jour profil
async updateProfile(profileData: any): Promise<{ success: boolean; message: string; user?: UserResponse }>

// Déconnexion
async logout(): Promise<void>

// Restaurer session
async restoreSession(): Promise<void>

// Header d'authentification
getAuthHeader(): { Authorization: string } | {}

// Permissions
hasPermission(permission: string): boolean
hasRole(role: string): boolean
```

**Signaux disponibles:**

```typescript
currentUser = signal<UserResponse | null>(null)        // Utilisateur connecté
currentToken = signal<string | null>(null)             // Token JWT
isOnline = signal<boolean>(navigator.onLine)           // État connexion
syncStatus = signal<SyncStatus>(...)                   // Statut sync

isLoggedIn = computed(...)                             // Connecté?
canUseOfflineMode = computed(...)                      // Offline disponible?
```

### AuthApiService (`services/auth-api.service.ts`)

Service HTTP pour communiquer avec le backend.

**Endpoints:**

- `register(user)` - POST `/api/auth/register`
- `login(loginData)` - POST `/api/auth/login`
- `getAuthenticatedUser(token)` - GET `/api/auth/agent?token=...`
- `logout()` - POST `/api/auth/logout`
- `updateUserInfo(updateData)` - PUT `/api/auth/profil/info`
- `changePassword(changePasswordData)` - PUT `/api/auth/change-password`
- `forgotPassword(forgotData)` - POST `/api/auth/forgot-password`
- `verifyResetToken(token)` - GET `/api/auth/verify-reset-token/:token`
- `resetPassword(token, resetData)` - POST `/api/auth/reset/:token`

## 🎨 Composants

### LoginComponent

Formulaire de connexion avec support online/offline.

**Fonctionnalités:**
- Connexion par email ou téléphone
- Indicateur de connexion/déconnexion
- Affichage/masquage du mot de passe
- Messages d'erreur clairs
- Support offline avec cache local

**Props des signaux:**
- `error` - Messages d'erreur
- `loading` - État chargement
- `showPassword` - Visbilité mot de passe
- `isOnline` - État connexion

### ForgotPasswordComponent

Formulaire de demande de réinitialisation de mot de passe.

**Fonctionnalités:**
- Saisie adresse email
- Validation email
- Message de confirmation
- Gestion des erreurs
- Redirection automatique après succès

### ResetPasswordComponent

Formulaire de réinitialisation avec token.

**Fonctionnalités:**
- Validation du token en premier
- Saisie nouveau mot de passe
- Confirmation mot de passe
- Validation des mots de passe correspondants
- Affichage/masquage des mots de passe
- États de chargement et d'erreur

## 🛣️ Routes

Les routes d'authentification sont définies dans `auth.routes.ts`:

```typescript
/auth/login                        - Connexion
/auth/forgot-password             - Oubli mot de passe
/auth/reset-password/:token       - Réinitialisation avec token
```

**Intégration dans app.routes.ts:**

```typescript
{
  path: 'auth',
  children: AUTH_ROUTES,
}
```

## 🔄 Flux d'authentification

### Connexion

```
1. Utilisateur remplit le formulaire login
2. LoginComponent envoie les données à AuthService.login()
3. AuthService.login() vérifie isOnline()
   ├─ Si ONLINE → appel AuthApiService.login() → Backend
   │  └─ Récupère token et infos utilisateur → sauvegarde locale
   └─ Si OFFLINE → cherche dans IndexedDB localSessions
4. Signal currentUser + currentToken mis à jour
5. Redirection vers /dashboard
```

### Oubli de mot de passe

```
1. Utilisateur remplit son email
2. ForgotPasswordComponent envoie à AuthService.forgotPassword()
3. AuthService.forgotPassword() envoie à AuthApiService.forgotPassword()
4. Backend envoie un email avec un lien de réinitialisation
5. Utilisateur clique le lien → /auth/reset-password/:token
```

### Réinitialisation de mot de passe

```
1. Utilisateur accède /auth/reset-password/:token
2. ResetPasswordComponent.ngOnInit() valide le token
   └─ AuthService.verifyResetToken() → Backend
3. Si token valide → affiche formulaire
4. Utilisateur remplit nouveau mot de passe
5. AuthService.resetPassword() → Backend
6. Succès → redirection /auth/login
```

## 🔒 Guard d'authentification

Le `authGuard` protège les routes protégées:

```typescript
// app.routes.ts
{
  path: '',
  canActivate: [authGuard],
  children: [/* routes protégées */]
}
```

Si non connecté → redirection vers `/auth/login`

## 💾 Stockage des données

### LocalStorage
- `auth_token` - Token JWT
- `current_user` - Données utilisateur (JSON)

### SessionStorage
- `offline_pwd_${uuid}` - Mot de passe offline (temporaire)

### IndexedDB (Dexie)
- `users` - Cache des utilisateurs
- `localSessions` - Sessions offline
- `offlineChanges` - Changements en attente de sync

## 🚀 Utilisation dans d'autres composants

### Récupérer l'utilisateur connecté

```typescript
import { AuthService } from '@app/auth';

export class MyComponent {
  private auth = inject(AuthService);
  
  currentUser = this.auth.currentUser;
  
  get isConnected() {
    return this.auth.isLoggedIn();
  }
}
```

### Vérifier les permissions

```typescript
export class MyComponent {
  private auth = inject(AuthService);
  
  canEdit = computed(() => 
    this.auth.hasPermission('edit') || this.auth.hasRole('SuperAdmin')
  );
}
```

### Obtenir l'header d'authentification

```typescript
const headers = this.auth.getAuthHeader();
// { Authorization: 'Bearer TOKEN' } ou {}
```

### Se déconnecter

```typescript
async logout() {
  await this.auth.logout();
  // Redirection vers /auth/login automatique
}
```

## 🔧 Configuration

L'URL du backend est configurée dans `src/app/config/environment.ts`:

```typescript
export const environment = {
  apiUrl: 'http://localhost:5000/api',
};
```

À adapter selon votre environnement.

## 🐛 Débogage

### Logs de développement

```typescript
// Dans la console du navigateur
localStorage.getItem('auth_token')
localStorage.getItem('current_user')

// IndexedDB
indexedDB.databases()  // Liste les BD
db.users.toArray()     // Voir les utilisateurs en cache
db.localSessions.toArray() // Voir les sessions offline
```

## ✨ Bonnes pratiques

✅ **À faire:**
- Toujours vérifier `auth.isLoggedIn()` avant d'accéder aux données
- Utiliser le signal `currentUser` en lieu et place des appels répétés
- Mettre à jour le profil via `auth.updateProfile()`
- Logout via `auth.logout()` pas manuellement

❌ **À éviter:**
- Modifier directement `currentUser.set()`
- Stocker des données sensibles en clair dans le cache
- Naviguer sans passer par le router
- Ignorer les erreurs d'authentification

## 🔗 Middleware Backend Go

Le middleware d'authentification Go:

```go
func IsAuthenticated(c *fiber.Ctx) error {
    token := c.Query("token")
    
    userUUID, err := utils.VerifyJwt(token)
    if err != nil {
        c.Status(fiber.StatusUnauthorized)
        return c.JSON(fiber.Map{
            "message": "unauthenticated",
        })
    }
    
    c.Locals("user_uuid", userUUID)
    c.Next()
    return nil
}
```

À utiliser sur les routes protégées comme `/api/auth/agent`.
