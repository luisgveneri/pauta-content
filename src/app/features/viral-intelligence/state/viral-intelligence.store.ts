import { Injectable, computed, inject, signal } from '@angular/core';
import { ViralIntelligenceService } from '../data-access/viral-intelligence.service';
import {
  MonitoredAccount,
  PersonalizationLevel,
  PlanAdaptationDto,
  RecommendedTrend,
  Trend,
  TrendAdaptation,
  TrendFilters,
} from '../domain/trend.model';

type ViralIntelligenceState = {
  loading: boolean;
  trends: Trend[];
  filters: TrendFilters;
  error: string | null;
  seeding: boolean;
  detailLoading: boolean;
  currentTrend: Trend | null;
  detailError: string | null;
  adapting: boolean;
  currentAdaptation: TrendAdaptation | null;
  adaptError: string | null;
  planning: boolean;
  planError: string | null;
  recommendationsLoading: boolean;
  recommendationsLoaded: boolean;
  recommendations: RecommendedTrend[];
  personalizationLevel: PersonalizationLevel;
  recommendationsError: string | null;
  savedLoading: boolean;
  savedLoaded: boolean;
  saved: Trend[];
  savedError: string | null;
  savingTrendId: string | null;
  monitoredAccountsLoading: boolean;
  monitoredAccountsLoaded: boolean;
  monitoredAccounts: MonitoredAccount[];
  monitoredAccountsError: string | null;
  addingMonitoredAccount: boolean;
  syncingRealSources: boolean;
};

const INITIAL_STATE: ViralIntelligenceState = {
  loading: false,
  trends: [],
  filters: { sort: 'score' },
  error: null,
  seeding: false,
  detailLoading: false,
  currentTrend: null,
  detailError: null,
  adapting: false,
  currentAdaptation: null,
  adaptError: null,
  planning: false,
  planError: null,
  recommendationsLoading: false,
  recommendationsLoaded: false,
  recommendations: [],
  personalizationLevel: 'generic',
  recommendationsError: null,
  savedLoading: false,
  savedLoaded: false,
  saved: [],
  savedError: null,
  savingTrendId: null,
  monitoredAccountsLoading: false,
  monitoredAccountsLoaded: false,
  monitoredAccounts: [],
  monitoredAccountsError: null,
  addingMonitoredAccount: false,
  syncingRealSources: false,
};

/** No constructor effect, same call as PlaytomicStore/CampaignInsightsStore — each tab triggers its own load() the first time it's opened. */
@Injectable({ providedIn: 'root' })
export class ViralIntelligenceStore {
  private readonly service = inject(ViralIntelligenceService);

  private readonly _state = signal<ViralIntelligenceState>(INITIAL_STATE);

  readonly loading = computed(() => this._state().loading);
  readonly trends = computed(() => this._state().trends);
  readonly filters = computed(() => this._state().filters);
  readonly error = computed(() => this._state().error);
  readonly seeding = computed(() => this._state().seeding);
  readonly detailLoading = computed(() => this._state().detailLoading);
  readonly currentTrend = computed(() => this._state().currentTrend);
  readonly detailError = computed(() => this._state().detailError);

  readonly adapting = computed(() => this._state().adapting);
  readonly currentAdaptation = computed(() => this._state().currentAdaptation);
  readonly adaptError = computed(() => this._state().adaptError);
  readonly planning = computed(() => this._state().planning);
  readonly planError = computed(() => this._state().planError);

  readonly recommendationsLoading = computed(() => this._state().recommendationsLoading);
  readonly recommendations = computed(() => this._state().recommendations);
  readonly personalizationLevel = computed(() => this._state().personalizationLevel);
  readonly recommendationsError = computed(() => this._state().recommendationsError);

  readonly savedLoading = computed(() => this._state().savedLoading);
  readonly saved = computed(() => this._state().saved);
  readonly savedError = computed(() => this._state().savedError);
  readonly savedTrendIds = computed(() => new Set(this._state().saved.map((t) => t.id)));
  readonly savingTrendId = computed(() => this._state().savingTrendId);

  readonly monitoredAccountsLoading = computed(() => this._state().monitoredAccountsLoading);
  readonly monitoredAccounts = computed(() => this._state().monitoredAccounts);
  readonly monitoredAccountsError = computed(() => this._state().monitoredAccountsError);
  readonly addingMonitoredAccount = computed(() => this._state().addingMonitoredAccount);
  readonly syncingRealSources = computed(() => this._state().syncingRealSources);

  async loadTrends() {
    this._state.update((s) => ({ ...s, loading: true, error: null }));
    try {
      const trends = await this.service.listTrends(this._state().filters);
      this._state.update((s) => ({ ...s, loading: false, trends }));
    } catch (error) {
      this._state.update((s) => ({ ...s, loading: false, error: this.extractError(error) }));
    }
  }

  async setFilters(filters: TrendFilters) {
    this._state.update((s) => ({ ...s, filters }));
    await this.loadTrends();
  }

  async loadOne(id: string) {
    this._state.update((s) => ({
      ...s,
      detailLoading: true,
      detailError: null,
      currentTrend: null,
      currentAdaptation: null,
      adaptError: null,
      planError: null,
    }));
    try {
      const currentTrend = await this.service.getTrend(id);
      this._state.update((s) => ({ ...s, detailLoading: false, currentTrend }));
    } catch (error) {
      this._state.update((s) => ({ ...s, detailLoading: false, detailError: this.extractError(error) }));
    }
  }

  /** Adapt -> generate idea -> generate script happen in one AI call on the backend — see AdaptationService.adapt(). */
  async adaptTrend(trendId: string) {
    this._state.update((s) => ({ ...s, adapting: true, adaptError: null }));
    try {
      const currentAdaptation = await this.service.adaptTrend(trendId);
      this._state.update((s) => ({ ...s, adapting: false, currentAdaptation }));
    } catch (error) {
      this._state.update((s) => ({ ...s, adapting: false, adaptError: this.extractError(error) }));
    }
  }

  async planAdaptation(dto: PlanAdaptationDto) {
    const adaptationId = this._state().currentAdaptation?.id;
    if (!adaptationId) return;

    this._state.update((s) => ({ ...s, planning: true, planError: null }));
    try {
      const currentAdaptation = await this.service.planAdaptation(adaptationId, dto);
      this._state.update((s) => ({ ...s, planning: false, currentAdaptation }));
    } catch (error) {
      this._state.update((s) => ({ ...s, planning: false, planError: this.extractError(error) }));
    }
  }

  /** Loads once per session unless forced — recommendations don't need to be refetched every time the tab is reopened. */
  async loadRecommendations(force = false) {
    if (this._state().recommendationsLoaded && !force) return;
    this._state.update((s) => ({ ...s, recommendationsLoading: true, recommendationsError: null }));
    try {
      const response = await this.service.getRecommendations();
      this._state.update((s) => ({
        ...s,
        recommendationsLoading: false,
        recommendationsLoaded: true,
        recommendations: response.recommendations,
        personalizationLevel: response.personalizationLevel,
      }));
    } catch (error) {
      this._state.update((s) => ({
        ...s,
        recommendationsLoading: false,
        recommendationsError: this.extractError(error),
      }));
    }
  }

  async loadSaved(force = false) {
    if (this._state().savedLoaded && !force) return;
    this._state.update((s) => ({ ...s, savedLoading: true, savedError: null }));
    try {
      const saved = await this.service.listSaved();
      this._state.update((s) => ({ ...s, savedLoading: false, savedLoaded: true, saved }));
    } catch (error) {
      this._state.update((s) => ({ ...s, savedLoading: false, savedError: this.extractError(error) }));
    }
  }

  async toggleSave(trendId: string) {
    const alreadySaved = this.savedTrendIds().has(trendId);
    this._state.update((s) => ({ ...s, savingTrendId: trendId }));
    try {
      if (alreadySaved) {
        await this.service.unsaveTrend(trendId);
      } else {
        await this.service.saveTrend(trendId);
      }
      this._state.update((s) => ({ ...s, savingTrendId: null }));
      await this.loadSaved(true);
    } catch (error) {
      this._state.update((s) => ({ ...s, savingTrendId: null, savedError: this.extractError(error) }));
    }
  }

  async seedMockData() {
    this._state.update((s) => ({ ...s, seeding: true, error: null }));
    try {
      await this.service.seedMockData();
      this._state.update((s) => ({ ...s, seeding: false }));
      await Promise.all([this.loadTrends(), this.loadRecommendations(true)]);
    } catch (error) {
      this._state.update((s) => ({ ...s, seeding: false, error: this.extractError(error) }));
    }
  }

  async clearMockData() {
    this._state.update((s) => ({ ...s, seeding: true, error: null }));
    try {
      await this.service.clearMockData();
      this._state.update((s) => ({ ...s, seeding: false }));
      await Promise.all([this.loadTrends(), this.loadRecommendations(true)]);
    } catch (error) {
      this._state.update((s) => ({ ...s, seeding: false, error: this.extractError(error) }));
    }
  }

  async loadMonitoredAccounts(force = false) {
    if (this._state().monitoredAccountsLoaded && !force) return;
    this._state.update((s) => ({ ...s, monitoredAccountsLoading: true, monitoredAccountsError: null }));
    try {
      const monitoredAccounts = await this.service.listMonitoredAccounts();
      this._state.update((s) => ({
        ...s,
        monitoredAccountsLoading: false,
        monitoredAccountsLoaded: true,
        monitoredAccounts,
      }));
    } catch (error) {
      this._state.update((s) => ({
        ...s,
        monitoredAccountsLoading: false,
        monitoredAccountsError: this.extractError(error),
      }));
    }
  }

  async addMonitoredAccount(username: string) {
    const trimmed = username.trim();
    if (!trimmed) return;

    this._state.update((s) => ({ ...s, addingMonitoredAccount: true, monitoredAccountsError: null }));
    try {
      const account = await this.service.addMonitoredAccount(trimmed);
      this._state.update((s) => ({
        ...s,
        addingMonitoredAccount: false,
        monitoredAccounts: [account, ...s.monitoredAccounts],
      }));
    } catch (error) {
      this._state.update((s) => ({
        ...s,
        addingMonitoredAccount: false,
        monitoredAccountsError: this.extractError(error),
      }));
    }
  }

  async removeMonitoredAccount(id: string) {
    this._state.update((s) => ({ ...s, monitoredAccountsError: null }));
    try {
      await this.service.removeMonitoredAccount(id);
      this._state.update((s) => ({
        ...s,
        monitoredAccounts: s.monitoredAccounts.filter((a) => a.id !== id),
      }));
    } catch (error) {
      this._state.update((s) => ({ ...s, monitoredAccountsError: this.extractError(error) }));
    }
  }

  /** Runs Business Discovery for every monitored account, then refreshes Discover/For You so new real trends show up immediately. */
  async syncRealSources() {
    this._state.update((s) => ({ ...s, syncingRealSources: true, monitoredAccountsError: null }));
    try {
      await this.service.syncMonitoredAccounts();
      this._state.update((s) => ({ ...s, syncingRealSources: false }));
      await Promise.all([this.loadTrends(), this.loadRecommendations(true), this.loadMonitoredAccounts(true)]);
    } catch (error) {
      this._state.update((s) => ({
        ...s,
        syncingRealSources: false,
        monitoredAccountsError: this.extractError(error),
      }));
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
