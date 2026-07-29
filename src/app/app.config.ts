import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { APP_ENV } from './core/config/app-env.token';
import { defaultAppEnv } from './core/config/app-env.default';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    { provide: APP_ENV, useValue: defaultAppEnv },
    provideRouter(routes)
  ]
};
