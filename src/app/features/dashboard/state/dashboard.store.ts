import { Injectable, computed, inject, signal } from '@angular/core';
import { DashboardService } from '../data-access/dashboard.service';
import { DashboardStats } from '../domain/dashboard-stats.model';

type DashboardState = {
  loading: boolean;
  stats: DashboardStats;
};

@Injectable({ providedIn: 'root' })
export class DashboardStore {
  private readonly dashboardService = inject(DashboardService);

  private readonly _state = signal<DashboardState>({
    loading: true,
    stats: {
      totalViews7d: 0,
      totalLikes7d: 0,
      videosPosted7d: 0,
      followerGrowth7d: 0,
    },
  });

  readonly loading = computed(() => this._state().loading);
  readonly stats = computed(() => this._state().stats);

  constructor() {
    void this.refresh();
  }

  async refresh() {
    this._state.update((s) => ({ ...s, loading: true }));
    const stats = await this.dashboardService.getStats();
    this._state.set({ loading: false, stats });
  }
}

