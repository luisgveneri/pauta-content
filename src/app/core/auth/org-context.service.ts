import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiClient } from '../http/api-client.service';
import { apiEndpoints } from '../http/api-endpoints';
import { ClerkService } from './clerk.service';

export type OrganizationType = 'CLUB' | 'CREATOR';
export type BusinessRole = 'manager' | 'reception' | null;

type CurrentOrganizationResponse = {
  organizationId: string;
  name: string;
  type: OrganizationType;
  businessRole: BusinessRole;
};

/**
 * Resolves our own domain concepts (organization vertical + business role)
 * for the active Clerk organization. This is NOT exposed by Clerk itself —
 * `type`/`businessRole` only exist in our backend (see
 * ClerkAuthGuard + GET /organizations/current) — so unlike ClerkService this
 * always requires a round-trip to our API.
 */
@Injectable({ providedIn: 'root' })
export class OrgContextService {
  private readonly api = inject(ApiClient);
  private readonly clerk = inject(ClerkService);

  private readonly loading = signal(true);
  private readonly organizationName = signal<string | null>(null);
  private readonly organizationType = signal<OrganizationType | null>(null);
  private readonly businessRole = signal<BusinessRole>(null);

  readonly isLoading = computed(() => this.loading());
  readonly name = computed(() => this.organizationName());
  readonly type = computed(() => this.organizationType());
  readonly role = computed(() => this.businessRole());
  readonly isClub = computed(() => this.organizationType() === 'CLUB');

  constructor() {
    effect(() => {
      if (this.clerk.activeOrganizationId()) {
        void this.refresh();
      } else {
        this.reset();
      }
    });
  }

  /** Fetches the current org's type/role from our backend. Safe to call directly (e.g. from a route guard) — idempotent, always gets fresh data. */
  async refresh(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(
        this.api.get<CurrentOrganizationResponse>(apiEndpoints.organizations.current),
      );
      this.organizationName.set(res.name);
      this.organizationType.set(res.type);
      this.businessRole.set(res.businessRole);
    } catch {
      this.reset();
    } finally {
      this.loading.set(false);
    }
  }

  private reset() {
    this.organizationName.set(null);
    this.organizationType.set(null);
    this.businessRole.set(null);
    this.loading.set(false);
  }
}
