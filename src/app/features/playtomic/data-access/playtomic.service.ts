import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiClient } from '../../../core/http/api-client.service';
import { apiEndpoints } from '../../../core/http/api-endpoints';
import { MorningBriefing, OccupancyGap, PlaytomicInsights } from '../domain/booking.model';

@Injectable({ providedIn: 'root' })
export class PlaytomicService {
  private readonly api = inject(ApiClient);

  getInsights(): Promise<PlaytomicInsights> {
    return firstValueFrom(this.api.get<PlaytomicInsights>(apiEndpoints.playtomic.insights));
  }

  getGaps(): Promise<OccupancyGap[]> {
    return firstValueFrom(this.api.get<OccupancyGap[]>(apiEndpoints.playtomic.gaps));
  }

  getBriefing(): Promise<MorningBriefing> {
    return firstValueFrom(this.api.get<MorningBriefing>(apiEndpoints.playtomic.briefing));
  }

  seedMockData(): Promise<{ created: number }> {
    return firstValueFrom(this.api.post<{ created: number }>(apiEndpoints.playtomic.seedMock, {}));
  }

  clearMockData(): Promise<{ deleted: number }> {
    return firstValueFrom(this.api.delete<{ deleted: number }>(apiEndpoints.playtomic.seedMock));
  }
}
