import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'fillup/new',
    loadComponent: () => import('./components/fillup-form/fillup-form.component').then(m => m.FillupFormComponent),
  },
  {
    path: 'fillup/:id/edit',
    loadComponent: () => import('./components/fillup-form/fillup-form.component').then(m => m.FillupFormComponent),
  },
  {
    path: 'history',
    loadComponent: () => import('./components/history/history.component').then(m => m.HistoryComponent),
  },
  {
    path: 'vehicles',
    loadComponent: () => import('./components/vehicles/vehicles.component').then(m => m.VehiclesComponent),
  },
  {
    path: 'vehicles/new',
    loadComponent: () => import('./components/vehicles/vehicle-form.component').then(m => m.VehicleFormComponent),
  },
  {
    path: 'vehicles/:id',
    loadComponent: () => import('./components/vehicles/vehicle-detail.component').then(m => m.VehicleDetailComponent),
  },
  {
    path: 'import',
    loadComponent: () => import('./components/import/import.component').then(m => m.ImportComponent),
  },
];
