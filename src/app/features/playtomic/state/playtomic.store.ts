import { Injectable, computed, inject, signal } from '@angular/core';
import { PlaytomicService } from '../data-access/playtomic.service';
import { MorningBriefing, OccupancyGap, PlaytomicInsights } from '../domain/booking.model';

type PlaytomicState = {
  loading: boolean;
  data: PlaytomicInsights | null;
  gaps: OccupancyGap[];
  briefing: MorningBriefing | null;
  error: string | null;
  seeding: boolean;
};

const INITIAL_STATE: PlaytomicState = {
  loading: false,
  data: null,
  gaps: [],
  briefing: null,
  error: null,
  seeding: false,
};

/** No constructor effect, same as CampaignInsightsStore — loaded on-demand by the page, not kept warm in the background. */
@Injectable({ providedIn: 'root' })
export class PlaytomicStore {
  private readonly playtomicService = inject(PlaytomicService);

  private readonly _state = signal<PlaytomicState>(INITIAL_STATE);

  readonly loading = computed(() => this._state().loading);
  readonly data = computed(() => this._state().data);
  readonly gaps = computed(() => this._state().gaps);
  readonly briefing = computed(() => this._state().briefing);
  readonly error = computed(() => this._state().error);
  readonly seeding = computed(() => this._state().seeding);

  async load() {
    this._state.update((s) => ({ ...s, loading: true, error: null }));
    try {
      const [data, gaps, briefing] = await Promise.all([
        this.playtomicService.getInsights(),
        this.playtomicService.getGaps(),
        this.playtomicService.getBriefing(),
      ]);
      this._state.update((s) => ({ ...s, loading: false, data, gaps, briefing }));
    } catch (error) {
      this._state.update((s) => ({ ...s, loading: false, error: this.extractError(error) }));
    }
  }

  async seedMockData() {
    this._state.update((s) => ({ ...s, seeding: true, error: null }));
    try {
      await this.playtomicService.seedMockData();
      this._state.update((s) => ({ ...s, seeding: false }));
      await this.load();
    } catch (error) {
      this._state.update((s) => ({ ...s, seeding: false, error: this.extractError(error) }));
    }
  }

  async clearMockData() {
    this._state.update((s) => ({ ...s, seeding: true, error: null }));
    try {
      await this.playtomicService.clearMockData();
      this._state.update((s) => ({ ...s, seeding: false }));
      await this.load();
    } catch (error) {
      this._state.update((s) => ({ ...s, seeding: false, error: this.extractError(error) }));
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
