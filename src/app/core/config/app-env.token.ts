import { InjectionToken } from '@angular/core';

export type AppEnv = {
  apiBaseUrl: string;
};

export const APP_ENV = new InjectionToken<AppEnv>('APP_ENV');

