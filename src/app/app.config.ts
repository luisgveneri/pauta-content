import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { ClerkService } from './core/auth/clerk.service';
import { APP_ENV } from './core/config/app-env.token';
import { defaultAppEnv } from './core/config/app-env.default';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withXhr(), withInterceptors([authInterceptor])),
    { provide: APP_ENV, useValue: defaultAppEnv },
    provideRouter(routes),
    provideAppInitializer(() => inject(ClerkService).init()),
  ],
};
