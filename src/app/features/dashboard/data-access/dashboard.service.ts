import { Injectable } from '@angular/core';
import { DashboardStats } from '../domain/dashboard-stats.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  async getStats(): Promise<DashboardStats> {
    return {
      totalViews7d: 482_120,
      totalLikes7d: 38_640,
      videosPosted7d: 12,
      followerGrowth7d: 940,
    };
  }
}

