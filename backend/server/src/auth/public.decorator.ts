import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Opts an endpoint out of ClerkAuthGuard (e.g. the Clerk webhook, which is authenticated by Svix, not a user JWT). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
