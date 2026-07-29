import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: '',
    loadComponent: () =>
      import('./core/layout/app-shell/app-shell.component').then(
        (m) => m.AppShellComponent,
      ),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'content',
        loadComponent: () =>
          import('./features/content/content.page').then((m) => m.ContentPage),
      },
      {
        path: 'ideas',
        loadComponent: () =>
          import('./features/ideas/ideas.page').then((m) => m.IdeasPage),
      },
      {
        path: 'planner',
        loadComponent: () =>
          import('./features/planner/planner.page').then((m) => m.PlannerPage),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
