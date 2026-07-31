import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { ClerkService } from '../../../core/auth/clerk.service';
import { InstagramService } from '../data-access/instagram.service';
import {
  InstagramAccountAnalysisPayload,
  InstagramAnalysis,
  InstagramPost,
  InstagramStatus,
  InstagramTrendPoint,
} from '../domain/instagram.model';

type InstagramState = {
  statusLoading: boolean;
  status: InstagramStatus;
  connecting: boolean;
  connectError: string | null;
  syncing: boolean;
  syncError: string | null;
  postsLoading: boolean;
  posts: InstagramPost[];
  mediaTypeFilter: string | null;
  trendsLoading: boolean;
  trends: InstagramTrendPoint[];
  accountAnalysis: InstagramAnalysis<InstagramAccountAnalysisPayload> | null;
  analyzingAccount: boolean;
  analyzeAccountError: string | null;
};

const INITIAL_STATE: InstagramState = {
  statusLoading: true,
  status: { connected: false },
  connecting: false,
  connectError: null,
  syncing: false,
  syncError: null,
  postsLoading: false,
  posts: [],
  mediaTypeFilter: null,
  trendsLoading: false,
  trends: [],
  accountAnalysis: null,
  analyzingAccount: false,
  analyzeAccountError: null,
};

@Injectable({ providedIn: 'root' })
export class InstagramStore {
  private readonly instagramService = inject(InstagramService);
  private readonly clerk = inject(ClerkService);

  private readonly _state = signal<InstagramState>(INITIAL_STATE);

  readonly statusLoading = computed(() => this._state().statusLoading);
  readonly status = computed(() => this._state().status);
  readonly connected = computed(() => this._state().status.connected);
  readonly needsReconnect = computed(() => {
    const status = this._state().status;
    return status.connected && status.needsReconnect;
  });
  readonly username = computed(() => {
    const status = this._state().status;
    return status.connected ? status.username : '';
  });
  readonly lastSyncedAt = computed(() => {
    const status = this._state().status;
    return status.connected ? status.lastSyncedAt : null;
  });
  readonly connecting = computed(() => this._state().connecting);
  readonly connectError = computed(() => this._state().connectError);
  readonly syncing = computed(() => this._state().syncing);
  readonly syncError = computed(() => this._state().syncError);

  readonly postsLoading = computed(() => this._state().postsLoading);
  readonly posts = computed(() => this._state().posts);
  readonly overPerformers = computed(
    () => this._state().posts.filter((p) => p.performance?.classification === 'over').length,
  );
  readonly underPerformers = computed(
    () => this._state().posts.filter((p) => p.performance?.classification === 'under').length,
  );

  readonly trendsLoading = computed(() => this._state().trendsLoading);
  readonly trends = computed(() => this._state().trends);

  readonly accountAnalysis = computed(() => this._state().accountAnalysis);
  readonly analyzingAccount = computed(() => this._state().analyzingAccount);
  readonly analyzeAccountError = computed(() => this._state().analyzeAccountError);

  constructor() {
    effect(() => {
      if (this.clerk.activeOrganizationId()) {
        void this.refreshStatus();
      } else {
        this._state.set(INITIAL_STATE);
      }
    });
  }

  async refreshStatus() {
    this._state.update((s) => ({ ...s, statusLoading: true }));
    const status = await this.instagramService.getStatus();
    this._state.update((s) => ({ ...s, statusLoading: false, status }));
    if (status.connected) {
      void this.loadPosts();
      void this.loadTrends();
      void this.loadAccountAnalysis();
    }
  }

  async connect(accessToken: string, pageId?: string) {
    this._state.update((s) => ({ ...s, connecting: true, connectError: null }));
    try {
      await this.instagramService.connect(accessToken, pageId);
      this._state.update((s) => ({ ...s, connecting: false }));
      await this.refreshStatus();
    } catch (error) {
      this._state.update((s) => ({ ...s, connecting: false, connectError: this.extractError(error) }));
    }
  }

  /**
   * Navigates the whole browser to Meta's authorize dialog — a top-level
   * navigation, not an XHR, so there's no response to wait on in this tab.
   * The org id travels via the signed `state` the backend embeds in the
   * returned URL, not anything this method passes along.
   */
  async connectViaOAuth() {
    this._state.update((s) => ({ ...s, connectError: null }));
    try {
      const { url } = await this.instagramService.getOAuthConnectUrl();
      window.location.href = url;
    } catch (error) {
      this._state.update((s) => ({ ...s, connectError: this.extractError(error) }));
    }
  }

  async disconnect() {
    await this.instagramService.disconnect();
    this._state.set({ ...INITIAL_STATE, statusLoading: false });
  }

  async sync() {
    this._state.update((s) => ({ ...s, syncing: true, syncError: null }));
    try {
      await this.instagramService.sync();
      this._state.update((s) => ({ ...s, syncing: false }));
      await Promise.all([this.loadPosts(), this.loadTrends(), this.refreshStatus()]);
    } catch (error) {
      this._state.update((s) => ({ ...s, syncing: false, syncError: this.extractError(error) }));
    }
  }

  async loadPosts() {
    this._state.update((s) => ({ ...s, postsLoading: true }));
    const posts = await this.instagramService.listPosts({
      mediaType: this._state().mediaTypeFilter ?? undefined,
    });
    this._state.update((s) => ({ ...s, postsLoading: false, posts }));
  }

  async loadTrends() {
    this._state.update((s) => ({ ...s, trendsLoading: true }));
    const trends = await this.instagramService.getTrends();
    this._state.update((s) => ({ ...s, trendsLoading: false, trends }));
  }

  async loadAccountAnalysis() {
    try {
      const accountAnalysis = await this.instagramService.getAccountAnalysis();
      this._state.update((s) => ({ ...s, accountAnalysis }));
    } catch {
      this._state.update((s) => ({ ...s, accountAnalysis: null }));
    }
  }

  async generateAccountAnalysis() {
    this._state.update((s) => ({ ...s, analyzingAccount: true, analyzeAccountError: null }));
    try {
      const accountAnalysis = await this.instagramService.analyzeAccount();
      this._state.update((s) => ({ ...s, analyzingAccount: false, accountAnalysis }));
    } catch (error) {
      this._state.update((s) => ({ ...s, analyzingAccount: false, analyzeAccountError: this.extractError(error) }));
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
