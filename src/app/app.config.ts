import { APP_INITIALIZER, ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';

import { routes } from './app.routes';
import { AuthService } from './services/auth.service';
import { seedDatabase } from './utils/seed';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withHashLocation()),
    {
      provide: APP_INITIALIZER,
      useFactory: (auth: AuthService) => async () => {
        await seedDatabase();
        await auth.restoreSession();
      },
      deps: [AuthService],
      multi: true,
    },
  ],
};
