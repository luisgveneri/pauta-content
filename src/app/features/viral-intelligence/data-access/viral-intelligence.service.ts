import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiClient } from '../../../core/http/api-client.service';
import { apiEndpoints } from '../../../core/http/api-endpoints';
import { PlanAdaptationDto, RecommendationsResponse, Trend, TrendAdaptation, TrendFilters } from '../domain/trend.model';

@Injectable({ providedIn: 'root' })
export class ViralIntelligenceService {
  private readonly api = inject(ApiClient);

  listTrends(filters: TrendFilters): Promise<Trend[]> {
    return firstValueFrom(this.api.get<Trend[]>(apiEndpoints.viralIntelligence.trends, filters));
  }

  getTrend(id: string): Promise<Trend> {
    return firstValueFrom(this.api.get<Trend>(apiEndpoints.viralIntelligence.trend(id)));
  }

  getRecommendations(): Promise<RecommendationsResponse> {
    return firstValueFrom(this.api.get<RecommendationsResponse>(apiEndpoints.viralIntelligence.recommendations));
  }

  listSaved(): Promise<Trend[]> {
    return firstValueFrom(this.api.get<Trend[]>(apiEndpoints.viralIntelligence.saved));
  }

  saveTrend(id: string): Promise<{ saved: boolean }> {
    return firstValueFrom(this.api.post<{ saved: boolean }>(apiEndpoints.viralIntelligence.save(id), {}));
  }

  unsaveTrend(id: string): Promise<{ saved: boolean }> {
    return firstValueFrom(this.api.delete<{ saved: boolean }>(apiEndpoints.viralIntelligence.save(id)));
  }

  adaptTrend(id: string): Promise<TrendAdaptation> {
    return firstValueFrom(this.api.post<TrendAdaptation>(apiEndpoints.viralIntelligence.adapt(id), {}));
  }

  planAdaptation(adaptationId: string, dto: PlanAdaptationDto): Promise<TrendAdaptation> {
    return firstValueFrom(
      this.api.post<TrendAdaptation>(apiEndpoints.viralIntelligence.plan(adaptationId), dto),
    );
  }

  seedMockData(): Promise<{ discovered: number }> {
    return firstValueFrom(this.api.post<{ discovered: number }>(apiEndpoints.viralIntelligence.seedMock, {}));
  }

  clearMockData(): Promise<{ deleted: number }> {
    return firstValueFrom(this.api.delete<{ deleted: number }>(apiEndpoints.viralIntelligence.seedMock));
  }
}
