import { Injectable, computed, inject, signal } from '@angular/core';
import { PlannerService } from '../data-access/planner.service';
import { PlannerItem, PlannerItemStatus } from '../domain/planner-item.model';

type PlannerState = {
  loading: boolean;
  view: 'list' | 'calendar';
  items: PlannerItem[];
};

@Injectable({ providedIn: 'root' })
export class PlannerStore {
  private readonly plannerService = inject(PlannerService);

  private readonly _state = signal<PlannerState>({
    loading: true,
    view: 'list',
    items: [],
  });

  readonly loading = computed(() => this._state().loading);
  readonly view = computed(() => this._state().view);
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
    this._state.update((s) => ({ ...s, loading: true }));
    const items = await this.plannerService.listItems();
    this._state.update((s) => ({ ...s, loading: false, items }));
  }

  setView(view: 'list' | 'calendar') {
    this._state.update((s) => ({ ...s, view }));
  }

  async addMockItem() {
    const item = await this.plannerService.createMockItem();
    this._state.update((s) => ({ ...s, items: [...s.items, item] }));
  }
}

