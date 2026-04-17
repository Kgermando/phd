import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { AUTH_ROUTES } from './auth';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'auth',
    children: AUTH_ROUTES,
  },
  {
    path: '',
    loadComponent: () => import('./layout/layout').then((m) => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardComponent),
      },
      {
        path: 'producteurs',
        loadComponent: () => import('./pages/producers/producers-list').then((m) => m.ProducersListComponent),
      },
      {
        path: 'producteurs/nouveau',
        loadComponent: () => import('./pages/producers/producer-form').then((m) => m.ProducerFormComponent),
      },
      {
        path: 'producteurs/:id',
        loadComponent: () => import('./pages/producers/producer-detail').then((m) => m.ProducerDetailComponent),
      },
      {
        path: 'producteurs/:id/modifier',
        loadComponent: () => import('./pages/producers/producer-form').then((m) => m.ProducerFormComponent),
      },
      {
        path: 'carte',
        loadComponent: () => import('./pages/map/map').then((m) => m.MapComponent),
      },
      {
        path: 'profil',
        loadComponent: () => import('./pages/profile/profile').then((m) => m.ProfileComponent),
      },
      {
        path: 'utilisateurs',
        loadComponent: () => import('./pages/users/users-list').then((m) => m.UsersListComponent),
      },
      {
        path: 'utilisateurs/nouveau',
        loadComponent: () => import('./pages/users/user-form').then((m) => m.UserFormComponent),
      },
      {
        path: 'utilisateurs/:id',
        loadComponent: () => import('./pages/users/users-list').then((m) => m.UsersListComponent),
      },
      {
        path: 'utilisateurs/:id/modifier',
        loadComponent: () => import('./pages/users/user-form').then((m) => m.UserFormComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
