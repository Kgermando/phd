import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { nonProducteurGuard } from './guards/role.guard';
import { AUTH_ROUTES } from './auth';
import { AuthService } from './auth/services/auth.service';

const rootGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const target = auth.currentUser()?.role === 'Producteur' ? '/producteurs' : '/dashboard';
  return router.createUrlTree([target]);
};

export const routes: Routes = [
  { path: '', canActivate: [rootGuard], children: [] },
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
        canActivate: [nonProducteurGuard],
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
        canActivate: [nonProducteurGuard],
        loadComponent: () => import('./pages/map/map').then((m) => m.MapComponent),
      },
      {
        path: 'profil',
        loadComponent: () => import('./pages/profile/profile').then((m) => m.ProfileComponent),
      },
      {
        path: 'utilisateurs',
        canActivate: [nonProducteurGuard],
        loadComponent: () => import('./pages/users/users-list').then((m) => m.UsersListComponent),
      },
      {
        path: 'utilisateurs/nouveau',
        canActivate: [nonProducteurGuard],
        loadComponent: () => import('./pages/users/user-form').then((m) => m.UserFormComponent),
      },
      {
        path: 'utilisateurs/:id',
        canActivate: [nonProducteurGuard],
        loadComponent: () => import('./pages/users/users-list').then((m) => m.UsersListComponent),
      },
      {
        path: 'utilisateurs/:id/modifier',
        canActivate: [nonProducteurGuard],
        loadComponent: () => import('./pages/users/user-form').then((m) => m.UserFormComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
