import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./components/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./components/forgot-password/forgot-password').then((m) => m.ForgotPasswordComponent),
  },
  {
    path: 'reset-password/:token',
    loadComponent: () => import('./components/reset-password/reset-password').then((m) => m.ResetPasswordComponent),
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
];
