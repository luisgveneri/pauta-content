import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { OrgContextService } from './org-context.service';

/** Restricts a route to CLUB organizations. Non-CLUB orgs get the same treatment as any unknown route (redirect to /dashboard) — this app has no dedicated 404 page. */
export const clubOnlyGuard: CanActivateFn = async () => {
  const orgContext = inject(OrgContextService);
  const router = inject(Router);

  await orgContext.refresh();

  if (orgContext.type() !== 'CLUB') {
    return router.parseUrl('/dashboard');
  }
  return true;
};
