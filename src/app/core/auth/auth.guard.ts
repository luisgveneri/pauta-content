import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ClerkService } from './clerk.service';

export const authGuard: CanActivateFn = async () => {
  const clerk = inject(ClerkService);
  const router = inject(Router);

  await clerk.init();

  if (!clerk.isSignedIn()) {
    return router.parseUrl('/sign-in');
  }
  if (!clerk.activeOrganizationId()) {
    return router.parseUrl('/select-organization');
  }
  return true;
};
