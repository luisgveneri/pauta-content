import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { clubOnlyGuard } from './core/auth/club-only.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'sign-in',
    loadComponent: () => import('./core/auth/sign-in.page').then((m) => m.SignInPage),
  },
  {
    path: 'select-organization',
    loadComponent: () => import('./core/auth/select-organization.page').then((m) => m.SelectOrganizationPage),
  },
  {
    path: '',
    canActivate: [authGuard],
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
      {
        path: 'instagram',
        loadComponent: () =>
          import('./features/instagram/instagram.page').then((m) => m.InstagramPage),
      },
      {
        path: 'campaigns',
        canActivate: [clubOnlyGuard],
        loadComponent: () =>
          import('./features/campaigns/campaigns.page').then((m) => m.CampaignsPage),
      },
      // Must come before 'campaigns/:id' — Angular Router also matches
      // routes in declaration order, same trap we fixed on the backend.
      {
        path: 'campaigns/insights',
        canActivate: [clubOnlyGuard],
        loadComponent: () =>
          import('./features/campaigns/campaign-insights.page').then((m) => m.CampaignInsightsPage),
      },
      {
        path: 'campaigns/:id',
        canActivate: [clubOnlyGuard],
        loadComponent: () =>
          import('./features/campaigns/campaign-detail.page').then((m) => m.CampaignDetailPage),
      },
      {
        path: 'viral-intelligence',
        loadComponent: () =>
          import('./features/viral-intelligence/viral-intelligence.page').then((m) => m.ViralIntelligencePage),
      },
      {
        path: 'viral-intelligence/:id',
        loadComponent: () =>
          import('./features/viral-intelligence/trend-detail.page').then((m) => m.TrendDetailPage),
      },
      {
        path: 'playtomic',
        canActivate: [clubOnlyGuard],
        loadComponent: () =>
          import('./features/playtomic/playtomic.page').then((m) => m.PlaytomicPage),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
