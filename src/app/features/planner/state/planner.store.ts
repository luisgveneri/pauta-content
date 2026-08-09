import { Injectable, computed, inject, signal } from '@angular/core';
import { Platform } from '../../../shared/models/platform.model';
import { PlannerService } from '../data-access/planner.service';
import { PlannerItem, PlannerItemStatus } from '../domain/planner-item.model';

type PlannerState = {
  loading: boolean;
  view: 'list' | 'calendar';
  items: PlannerItem[];
  error: string | null;
  adding: boolean;
};

@Injectable({ providedIn: 'root' })
export class PlannerStore {
  private readonly plannerService = inject(PlannerService);

  private readonly _state = signal<PlannerState>({
    loading: true,
    view: 'list',
    items: [],
    error: null,
    adding: false,
  });

  readonly loading = computed(() => this._state().loading);
  readonly view = computed(() => this._state().view);
  readonly error = computed(() => this._state().error);
  readonly adding = computed(() => this._state().adding);
  readonly items = computed(() =>
    this._state().items.slice().sort((a, b) => a.date.localeCompare(b.date)),
  );

  readonly countsByStatus = computed(() => {
    const items = this._state().items;
    const base: Record<PlannerItemStatus, number> = {
      Draft: 0,
      Ready: 0,
      Scheduled: 0,
      Posted: 0,
    };
    for (const i of items) base[i.status] += 1;
    return base;
  });

  constructor() {
    void this.refresh();
  }

  async refresh() {
    this._state.update((s) => ({ ...s, loading: true, error: null }));
    try {
      const items = await this.plannerService.listItems();
      this._state.update((s) => ({ ...s, loading: false, items }));
    } catch (error) {
      this._state.update((s) => ({ ...s, loading: false, error: this.extractError(error) }));
    }
  }

  setView(view: 'list' | 'calendar') {
    this._state.update((s) => ({ ...s, view }));
  }

  async addItem() {
    const date = new Date();
    date.setDate(date.getDate() + 1);

    const platforms: Platform[] = ['TikTok', 'Instagram', 'YouTube', 'X'];
    const platform = platforms[Math.floor(Math.random() * platforms.length)];

    this._state.update((s) => ({ ...s, adding: true, error: null }));
    try {
      const item = await this.plannerService.createItem({
        date: date.toISOString(),
        title: 'New planned post',
        platform,
        status: 'Draft',
      });
      this._state.update((s) => ({ ...s, adding: false, items: [...s.items, item] }));
    } catch (error) {
      this._state.update((s) => ({ ...s, adding: false, error: this.extractError(error) }));
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
