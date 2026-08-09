import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { InstagramApiService } from '../instagram/instagram-api.service';
import { PerformanceService } from '../instagram/performance.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AdaptationService } from './adaptation.service';
import { MonitoredAccountsService } from './monitored-accounts.service';
import { InstagramTrendProvider } from './providers/instagram-trend.provider';
import { MockTrendProvider } from './providers/mock-trend.provider';
import {
  TREND_SOURCE_PROVIDERS,
  TrendSourceProvider,
} from './providers/trend-source-provider';
import { RecommendationService } from './recommendation.service';
import { SavedTrendsService } from './saved-trends.service';
import { TrendDiscoveryService } from './trend-discovery.service';
import { TrendPatternService } from './trend-pattern.service';
import { TrendScoringService } from './trend-scoring.service';
import { TrendsService } from './trends.service';
import { ViralIntelligenceController } from './viral-intelligence.controller';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [ViralIntelligenceController],
  providers: [
    TrendScoringService,
    TrendDiscoveryService,
    TrendsService,
    TrendPatternService,
    RecommendationService,
    SavedTrendsService,
    AdaptationService,
    MonitoredAccountsService,
    // Stateless and dependency-free, same as reusing a pure util — no need
    // to route it through InstagramModule's exports for one class.
    PerformanceService,
    InstagramApiService,
    MockTrendProvider,
    InstagramTrendProvider,
    {
      provide: TREND_SOURCE_PROVIDERS,
      useFactory: (
        mock: MockTrendProvider,
        instagram: InstagramTrendProvider,
      ): TrendSourceProvider[] => [mock, instagram],
      inject: [MockTrendProvider, InstagramTrendProvider],
    },
  ],
})
export class ViralIntelligenceModule {}
