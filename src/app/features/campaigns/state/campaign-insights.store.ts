import { Injectable, computed, inject, signal } from '@angular/core';
import { CampaignsService } from '../data-access/campaigns.service';
import { CampaignInsights } from '../domain/campaign.model';

type CampaignInsightsState = {
  loading: boolean;
  data: CampaignInsights | null;
  error: string | null;
};

const INITIAL_STATE: CampaignInsightsState = {
  loading: false,
  data: null,
  error: null,
};

/**
 * Unlike CampaignsStore, this has no constructor effect — insights are an
 * org-wide aggregate only needed when the /campaigns/insights page is
 * visited, not something the nav needs kept warm in the background. The page
 * triggers load() itself, same as CampaignsStore.loadOne() for campaign detail.
 */
@Injectable({ providedIn: 'root' })
export class CampaignInsightsStore {
  private readonly campaignsService = inject(CampaignsService);

  private readonly _state = signal<CampaignInsightsState>(INITIAL_STATE);

  readonly loading = computed(() => this._state().loading);
  readonly data = computed(() => this._state().data);
  readonly error = computed(() => this._state().error);

  async load() {
    this._state.update((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await this.campaignsService.getInsights();
      this._state.update((s) => ({ ...s, loading: false, data }));
    } catch (error) {
      this._state.update((s) => ({ ...s, loading: false, error: this.extractError(error) }));
    }
  }

  private extractError(error: unknown): string {
    if (error && typeof error === 'object' && 'error' in error) {
      const body = (error as { error?: { message?: string | string[] } }).error;
      if (body?.message) {
        return Array.isArray(body.message) ? body.message.join(' ') : body.message;
      }
    }
    return 'Something went wrong. Please try again.';
  }
}
