import { Injectable } from '@angular/core';
import { Platform } from '../../../shared/models/platform.model';
import { PlannerItem } from '../domain/planner-item.model';

const MOCK_PLANNER: PlannerItem[] = [
  {
    id: 'p1',
    date: '2026-03-20',
    title: 'Match recap: 3 turning points',
    platform: 'Instagram',
    status: 'Scheduled',
  },
  {
    id: 'p2',
    date: '2026-03-21',
    title: 'Drill: volley control in 60s',
    platform: 'TikTok',
    status: 'Ready',
  },
  {
    id: 'p3',
    date: '2026-03-23',
    title: 'Explainer: bandeja vs vibora',
    platform: 'YouTube',
    status: 'Draft',
  },
];

@Injectable({ providedIn: 'root' })
export class PlannerService {
  async listItems(): Promise<PlannerItem[]> {
    return MOCK_PLANNER;
  }

  async createMockItem(): Promise<PlannerItem> {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    const iso = date.toISOString().slice(0, 10);

    const platforms: Platform[] = ['TikTok', 'Instagram', 'YouTube', 'X'];
    const platform = platforms[Math.floor(Math.random() * platforms.length)];

    return {
      id: `p_${Date.now()}`,
      date: iso,
      title: 'New planned post (mock)',
      platform,
      status: 'Draft',
    };
  }
}

