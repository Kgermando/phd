 
/**
 * Configuration de l'application
 * À mettre à jour selon votre environnement
 */

export const environment = {
  production: false,
  // URL du backend Go/Fiber
  // Mettez à jour selon votre configuration
  apiUrl: 'http://localhost:8000/api',
  
  // Configuration offline/online
  offline: {
    // Conserver les données locales pendant 30 jours
    maxStorageAge: 30 * 24 * 60 * 60 * 1000,
    // Nettoyer les changements synchronisés après 7 jours
    cleanupAfterDays: 7,
  },

  // Options d'authentification
  auth: {
    tokenStorageKey: 'auth_token',
    userStorageKey: 'current_user',
    tokenExpiresIn: 24 * 60 * 60 * 1000, // 24 heures
  },
};
