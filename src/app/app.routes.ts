import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginComponent),
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
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
