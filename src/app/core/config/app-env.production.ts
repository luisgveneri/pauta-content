import { AppEnv } from './app-env.token';

export const defaultAppEnv: AppEnv = {
  apiBaseUrl: 'https://pauta-content.onrender.com',
  // Clerk publishable keys are meant to be public (embedded client-side), unlike the secret key.
  clerkPublishableKey: 'pk_test_b25lLWhhd2stNzcuY2xlcmsuYWNjb3VudHMuZGV2JA',
};
