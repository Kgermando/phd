# Configuration Backend Go - Intégration avec Frontend Angular

## Guide de mise en place

Ce document explique comment configurer votre backend Go/Fiber pour fonctionner correctement avec le frontend Angular mis à jour.

## 1. Configuration CORS

Ajoutez un middleware CORS pour permettre les requêtes du frontend:

```go
package main

import (
    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/fiber/v2/middleware/cors"
)

func setupCORS(app *fiber.App) {
    app.Use(cors.New(cors.Config{
        AllowOrigins:     "http://localhost:4200, https://votre-domaine.com", // À adapter
        AllowMethods:     "GET, POST, PUT, DELETE, OPTIONS",
        AllowHeaders:     "Content-Type, Authorization, Accept",
        ExposeHeaders:    "Content-Length",
        AllowCredentials: true,
        MaxAge:          3600,
    }))
}
```

## 2. Configuration des Routes API

Assurez-vous que les routes concordent avec celles du frontend:

### Routes d'authentification
```
POST   /api/auth/register              - Inscription
POST   /api/auth/login                 - Connexion
GET    /api/auth/agent                 - Récupérer l'utilisateur authentifié
POST   /api/auth/logout                - Déconnexion
PUT    /api/auth/profil/info           - Mettre à jour l'information du profil
PUT    /api/auth/change-password       - Changer le mot de passe
POST   /api/auth/forgot-password       - Demande de réinitialisation
GET    /api/auth/verify-reset-token/:token - Vérifier le token de réinitialisation
POST   /api/auth/reset/:token          - Réinitialiser le mot de passe
```

### Routes utilisateurs
```
GET    /api/users/all/paginate         - Obtenir les utilisateurs paginés
GET    /api/users/all                  - Obtenir tous les utilisateurs
GET    /api/users/get/:uuid            - Obtenir un utilisateur
POST   /api/users/create               - Créer un utilisateur
PUT    /api/users/update/:uuid         - Mettre à jour un utilisateur
DELETE /api/users/delete/:uuid         - Supprimer un utilisateur
```

## 3. Format des réponses API

Respectez les formats de réponses attendus par le frontend:

### Réponse d'authentification
```json
{
  "message": "success",
  "data": "jwt-token-here"
}
```

### Réponse utilisateur
```json
{
  "status": "success",
  "message": "user retrieved successfully",
  "data": {
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "fullname": "Moïse Lokota",
    "email": "moise@example.com",
    "telephone": "+243810000001",
    "role": "Agent",
    "permission": "survey,report",
    "status": true,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

### Réponse paginée
```json
{
  "status": "success",
  "message": "users retrieved successfully",
  "data": [
    { /* user objects */ }
  ],
  "pagination": {
    "total_records": 100,
    "total_pages": 7,
    "current_page": 1,
    "page_size": 15
  }
}
```

### Réponse d'erreur
```json
{
  "status": "error",
  "message": "Error message here",
  "errors": "Additional error details"
}
```

## 4. Authentification JWT

### Génération du token
- Incluez l'UUID de l'utilisateur en tant que claim `sub`
- Définissez une date d'expiration (par défaut 24h)
- Signez avec une clé secrète robuste

```go
import "github.com/golang-jwt/jwt/v5"

func GenerateJWT(userUUID string) (string, error) {
    claims := jwt.MapClaims{
        "sub": userUUID,
        "exp": time.Now().Add(24 * time.Hour).Unix(),
        "iat": time.Now().Unix(),
    }
    
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString([]byte("your-secret-key"))
}
```

### Vérification du token
```go
func VerifyJWT(tokenString string) (string, error) {
    token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
        if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
            return nil, errors.New("unexpected signing method")
        }
        return []byte("your-secret-key"), nil
    })
    
    if err != nil {
        return "", err
    }
    
    if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
        return claims["sub"].(string), nil
    }
    
    return "", errors.New("invalid token")
}
```

## 5. Middleware d'authentification

Implémentez un middleware pour protéger les routes:

```go
import "github.com/gofiber/fiber/v2"

func AuthMiddleware(c *fiber.Ctx) error {
    // Récupérer le token du header Authorization
    authHeader := c.Get("Authorization")
    if authHeader == "" {
        // Essayer le query parameter pour offline
        token := c.Query("token")
        if token == "" {
            return c.Status(401).JSON(fiber.Map{
                "status": "error",
                "message": "Missing token",
            })
        }
        
        userUUID, err := utils.VerifyJwt(token)
        if err != nil {
            return c.Status(401).JSON(fiber.Map{
                "status": "error",
                "message": "Invalid token",
            })
        }
        
        c.Locals("user_uuid", userUUID)
        return c.Next()
    }
    
    // Format: Bearer <token>
    if len(authHeader) < 7 || authHeader[:7] != "Bearer " {
        return c.Status(401).JSON(fiber.Map{
            "status": "error",
            "message": "Invalid authorization header format",
        })
    }
    
    token := authHeader[7:]
    userUUID, err := utils.VerifyJwt(token)
    if err != nil {
        return c.Status(401).JSON(fiber.Map{
            "status": "error",
            "message": "Invalid token",
        })
    }
    
    c.Locals("user_uuid", userUUID)
    return c.Next()
}
```

## 6. Validation des données

Assurez-vous que les champs requis sont validés:

```go
import "github.com/go-playground/validator/v10"

type LoginRequest struct {
    Identifier string `json:"identifier" validate:"required"`
    Password   string `json:"password" validate:"required"`
}

type UpdateUserRequest struct {
    Fullname      string `json:"fullname" validate:"required"`
    Email         string `json:"email" validate:"required,email"`
    Telephone     string `json:"telephone" validate:"required"`
    Role          string `json:"role" validate:"required"`
    Permission    string `json:"permission"`
    Status        bool   `json:"status"`
}
```

## 7. Gestion des erreurs

Retournez des réponses d'erreur cohérentes:

```go
func handleError(c *fiber.Ctx, code int, err error) error {
    return c.Status(code).JSON(fiber.Map{
        "status": "error",
        "message": err.Error(),
    })
}
```

## 8. Considérations de sécurité

### Hachage des mots de passe
```go
import "golang.org/x/crypto/bcrypt"

func HashPassword(password string) (string, error) {
    hash, err := bcrypt.GenerateFromPassword([]byte(password), 14)
    return string(hash), err
}

func VerifyPassword(hashedPassword, password string) error {
    return bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
}
```

### Stockage sécurisé des tokens
- Utilisez HTTPS en production
- Stockez les secrets les clés d'API dans les variables d'environnement
- Implémentez un système de renouvellement de tokens

### Rate limiting
```go
import "github.com/gofiber/fiber/v2/middleware/limiter"

app.Use(limiter.New(limiter.Config{
    Max:        20,
    Expiration: 1 * time.Minute,
}))
```

## 9. Tests d'intégration

### Scénario 1: Connexion Online
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@example.com","password":"password123"}'
```

### Scénario 2: Récupération d'utilisateur authentifié
```bash
curl -X GET "http://localhost:5000/api/auth/agent?token=JWT_TOKEN" \
  -H "Authorization: Bearer JWT_TOKEN"
```

### Scénario 3: Pagination des utilisateurs
```bash
curl -X GET "http://localhost:5000/api/users/all/paginate?page=1&limit=15&search=Agent"
```

## 10. Variables d'environnement

Définissez les variablesKey considérations:

```bash
# .env
DB_HOST=localhost
DB_PORT=5432
DB_USER=username
DB_PASSWORD=password
DB_NAME=rizsuivi_db

JWT_SECRET=your-very-secure-secret-key-here
JWT_EXPIRY=24h

API_PORT=5000
API_ENV=development

CORS_ORIGINS=http://localhost:4200,https://votre-domaine.com
```

## 11. Déploiement

### Docker Compose pour développement
```yaml
version: '3.8'
services:
  backend:
    build: .
    ports:
      - "5000:5000"
    environment:
      - DB_HOST=postgres
      - JWT_SECRET=dev-secret
    depends_on:
      - postgres
  
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=rizsuivi_db
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## 12. Troubleshooting

### Erreur: "Access-Control-Allow-Origin" missing
- Vérifiez la configuration CORS
- Assurez-vous que l'origine du frontend est autorisée
- Vérifiez les headers de réponse

### Erreur: "Invalid token"
- Le token a peut-être expiré
- La clé secrète ne correspond peut-être pas
- Vérifiez le format du token

### Erreur: "User not found"
- L'utilisateur n'existe peut-être pas dans la DB
- Vérifiez l'UUID utilisé
- Utilisez des UUIDs valids au format correct

## Support et maintenance

- Maintenez des logs détaillés pour le débogage
- Implémentez la surveillance et les alertes
- Gardez les dépendances à jour
- Testez régulièrement les connexions offline/online
