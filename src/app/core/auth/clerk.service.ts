import { Injectable, inject, signal } from '@angular/core';
import type { Clerk } from '@clerk/clerk-js';
import { APP_ENV } from '../config/app-env.token';

/**
 * Thin wrapper around @clerk/clerk-js (the framework-agnostic core SDK — there
 * is no official Clerk package for Angular). Exposes the bits the app needs as
 * signals, and hands out the raw `Clerk` instance for mounting prebuilt UI
 * (SignIn, OrganizationSwitcher, CreateOrganization) where needed.
 */
@Injectable({ providedIn: 'root' })
export class ClerkService {
  private readonly env = inject(APP_ENV);
  private clerk: Clerk | null = null;
  private initPromise: Promise<void> | null = null;

  readonly isSignedIn = signal(false);
  readonly activeOrganizationId = signal<string | null>(null);
  readonly activeOrganizationName = signal<string | null>(null);

  init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.doInit();
    }
    return this.initPromise;
  }

  private async doInit(): Promise<void> {
    const { Clerk } = await import('@clerk/clerk-js');
    const clerk = new Clerk(this.env.clerkPublishableKey);
    await clerk.load();
    this.clerk = clerk;
    this.syncState();
    clerk.addListener(() => this.syncState());
  }

  private syncState() {
    this.isSignedIn.set(!!this.clerk?.session);
    this.activeOrganizationId.set(this.clerk?.organization?.id ?? null);
    this.activeOrganizationName.set(this.clerk?.organization?.name ?? null);
  }

  async getToken(): Promise<string | null> {
    if (!this.clerk?.session) return null;
    return this.clerk.session.getToken();
  }

  get instance(): Clerk | null {
    return this.clerk;
  }
}
