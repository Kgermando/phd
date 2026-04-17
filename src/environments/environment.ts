
// Configuration de production
export const environment = {
  production: true,
  apiUrl: 'https://phd-api-production.up.railway.app/api', // À mettre à jour
  offline: {
    maxStorageAge: 30 * 24 * 60 * 60 * 1000,
    cleanupAfterDays: 7,
  },
  auth: {
    tokenStorageKey: 'auth_token',
    userStorageKey: 'current_user',
    tokenExpiresIn: 24 * 60 * 60 * 1000,
  },
};
