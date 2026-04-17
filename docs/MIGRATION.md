# Migration Frontend Angular - Alignement avec Backend Go/Fiber

## Vue d'ensemble des changements

Cette implémentation aligne le frontend Angular avec votre backend Go/Fiber et ajoute le support de l'authentification **Offline/Online**.

### Caractéristiques principales:

1. ✅ **Authentification Online/Offline**
   - Connexion en ligne via le backend Go
   - Connexion hors ligne via IndexedDB (Dexie)
   - Synchronisation automatique des données à la reconnexion

2. ✅ **Gestion des utilisateurs**
   - Support complet des opérations CRUD
   - Stockage local automatique
   - Synchronisation des changements en attente

3. ✅ **Persistance des données** 
   - IndexedDB (Dexie) pour le stockage local
   - Tracking des changements non synchronisés
   - Sessions locales pour l'accès hors ligne

4. ✅ **UX Réactive**
   - Indicateur de connexion/déconnexion
   - Statut de synchronisation
   - Messages d'erreur clairs

## Structure des fichiers créés/modifiés

### New Services:
- `src/app/services/api.service.ts` - Communication HTTP avec le backend
- `src/app/services/sync.service.ts` - Synchronisation offline/online
- `src/app/services/users.service.ts` - Gestion des utilisateurs
- `src/app/config/environment.ts` - Configuration de l'application

### Modified Models:
- `src/app/models/models.ts` - Modèles alignés avec le backend Go

### Updated Database:
- `src/app/db/database.ts` - Support des changements offline + sessions locales

### Updated Components:
- `src/app/pages/login/login.ts` - Support offline/online
- `src/app/pages/login/login.html` - Nouvelle UI avec statut de connexion
- `src/app/pages/login/login.scss` - Styles améliorés

### Configuration:
- `src/app/app.config.ts` - Ajout de HttpClient

## Configuration

### 1. Mettre à jour l'URL du backend

Modifiez `src/app/config/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://votre-backend:5000/api', // Adaptez l'URL
  // ... reste de la config
};
```

### 2. Installer les dépendances (si nécessaire)

Les dépendances principales sont déjà incluses:
- `dexie` - Pour IndexedDB
- `@angular/common/http` - Pour les appels HTTP

Si `dexie` n'est pas installée:
```bash
npm install dexie
```

### 3. Configuration du CORS (Backend côté)

Assurez-vous que votre backend Go accepte les requêtes CORS:

```go
// Dans votre middleware
c.Writer.Header().Set("Access-Control-Allow-Origin", "http://localhost:4200")
c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
```

## Utilisation

### 1. Connexion utilisateur

```typescript
// Dans le composant Login
const result = await this.auth.login(loginData);
if (result.success) {
  // Connexion réussie
  router.navigate(['/dashboard']);
}
```

### 2. Récupérer les utilisateurs

```typescript
// En ligne - récupère du backend et met en cache localement
const users = await this.usersService.getAllUsers(forceRefresh: true);

// Hors ligne - récupère du cache local
const users = await this.usersService.getAllUsers();
```

### 3. Créer/Mettre à jour/Supprimer un utilisateur

```typescript
// Online: synchronise avec le backend
// Offline: sauvegarde localement et marque pour synchronisation
const result = await this.usersService.createUser(userData);
```

### 4. Vérifier l'état de la synchronisation

```typescript
// Vérifier si en ligne
if (this.auth.isOnline()) {
  console.log('En ligne');
}

// Obtenir le statut
const status = this.sync.getSyncStatus();
console.log(`Changements en attente: ${status.pendingChanges}`);
```

### 5. Forcer la synchronisation manuelle

```typescript
const result = await this.sync.forceSyncAll();
console.log(`Synchronisés: ${result.synced}, Échoués: ${result.failed}`);
```

## Modèles de données

### User (Backend Go)
```go
type User struct {
    UUID            string    // ID unique
    Fullname        string    // Nom complet
    Email           string    // Email (unique)
    Telephone       string    // Téléphone (unique)
    Password        string    // Mot de passe hashé
    Role            string    // Rôle: Directeur, Secretaire, Chef du bureau, Agent, SuperAdmin
    Permission      string    // Permissions
    Status          bool      // Statut actif/inactif
    CreatedAt       time.Time // Date de création
    UpdatedAt       time.Time // Date de modification
}
```

### LocalSession (IndexedDB)
```typescript
interface LocalSession {
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
```

## Flux d'authentification

### Mode Online:
1. L'utilisateur saisit email/téléphone et mot de passe
2. `AuthService.login()` appelle `ApiService.login()`
3. Le backend valide et retourne un JWT
4. L'utilisateur et le token sont stockés localement
5. Redirection vers le dashboard

### Mode Offline:
1. L'utilisateur saisit email/téléphone et mot de passe
2. `AuthService.login()` cherche dans IndexedDB
3. Si trouvé et actif, connexion réussie
4. Les données locales sont utilisées
5. Redirection vers le dashboard

## Synchronisation des données

Quand la connexion Internet revient:

1. `SyncService` détecte la reconnexion
2. Récupère tous les changements en attente
3. Pour chaque changement:
   - Envoie au backend
   - Marque comme synchronisé si succès
4. Met à jour le statut de synchronisation
5. Notifie l'UI des changements

## Sécurité

### Recommandations:

1. **Hash des mots de passe** (offline)
   - Utilisez `bcryptjs` pour hasher les mots de passe localement
   - Ne jamais stocker le mot de passe en clair

2. **HTTPS en production**
   - Les tokens doivent être transmis via HTTPS

3. **Expiration des tokens**
   - Configurez l'expiration dans `environment.ts`
   - Validez régulièrement avec le backend

4. **Permissions**
   - Vérifiez les permissions avant chaque action critique
   - Implémentez les guards pour les routes protégées

## Gestion des erreurs

### Cas omniprésents:

```typescript
// Pas de connexion Internet
if (!this.auth.isOnline()) {
  // Utiliser les données locales
}

// Erreur de synchronisation
const syncStatus = this.sync.getSyncStatus();
if (syncStatus.pendingChanges > 0) {
  // Afficher à l'utilisateur qu'il y a des changements en attente
}

// Token expiré
// L'ApiService lance une erreur 401
// À gérer dans un intercepteur HTTP
```

## Mise à jour de l'application

### Pour les versions futures:

1. **Versionning de la DB Dexie**
   - Incrémenter la version dans `database.ts`
   - Fournir une stratégie de migration

2. **Nouveaux champs utilisateur**
   - Mettre à jour l'interface `User` dans `models.ts`
   - Mettre à jour les DTOs backend
   - Adapter les services

3. **Nouveaux endpoints**
   - Ajouter la méthode dans `ApiService`
   - Ajouter le support offline si nécessaire

## Dépannage

### L'utilisateur ne peut pas se connecter en ligne

1. Vérifiez l'URL du backend dans `environment.ts`
2. Vérifiez que le backend est en cours d'exécution
3. Vérifiez les headers CORS
4. Vérifiez les journaux navigateur (F12 > Network)

### Les changements offline ne se synchronisent pas

1. Assurez-vous qu'Internet est revenu
2. Vérifiez que le token n'a pas expiré
3. Consultez la console pour les erreurs d'API
4. Vérifiez `db.offlineChanges` dans IndexedDB

### Effacer le cache local (développement)

```javascript
// Dans la console du navigateur
indexedDB.deleteDatabase('RiziculteursDB');
location.reload();
```

## Améliorations futures

1. **Chiffrement des données offline** - Chiffrer les données sensibles dans IndexedDB
2. **Compression des données** - Compresser les changements en attente
3. **Synchronisation partielle** - Sync sélectif par entité
4. **Stratégie de cache**  - Cache intelligent avec TTL
5. **Service Worker** - Meilleur support offline et push notifications
6. **Encryption du stock local** - Protéger les données sensibles

## Support

Pour toute question ou problème:
1. Consultez les logs navigateur (F12)
2. Vérifiez IndexedDB (F12 > Application > IndexedDB)
3. Vérifiez l'onglet Network pour les requêtes API

## Licence

À adapter selon votre projet
