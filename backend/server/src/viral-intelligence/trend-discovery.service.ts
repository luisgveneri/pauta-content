import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TrendScoringService } from './trend-scoring.service';
import {
  RawTrend,
  TREND_SOURCE_PROVIDERS,
  TrendSourceProvider,
} from './providers/trend-source-provider';

@Injectable()
export class TrendDiscoveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoring: TrendScoringService,
    @Inject(TREND_SOURCE_PROVIDERS)
    private readonly providers: TrendSourceProvider[],
  ) {}

  /** Runs only the demo provider — tied to the "Refresh demo data" action, never mixed with real sources. */
  async seedMockData(): Promise<{ discovered: number }> {
    return this.runProviders((p) => p.isDemoSource);
  }

  /** Runs every real (non-demo) source — tied to "Sync real sources", explicitly triggered like every other pipeline stage in this module. */
  async syncRealSources(): Promise<{ discovered: number }> {
    return this.runProviders((p) => !p.isDemoSource);
  }

  private async runProviders(
    matches: (p: TrendSourceProvider) => boolean,
  ): Promise<{ discovered: number }> {
    let discovered = 0;
    const now = new Date();

    for (const provider of this.providers.filter(
      (p) => p.isAvailable && matches(p),
    )) {
      const rawTrends = await provider.discover({});
      for (const raw of rawTrends) {
        await this.upsert(raw, now);
        discovered += 1;
      }
    }

    return { discovered };
  }

  async clear(): Promise<{ deleted: number }> {
    const result = await this.prisma.trend.deleteMany({
      where: { isDemo: true },
    });
    return { deleted: result.count };
  }

  private async upsert(raw: RawTrend, now: Date) {
    const scoring = this.scoring.score(
      {
        views: raw.views,
        likes: raw.likes,
        comments: raw.comments,
        shares: raw.shares,
        saves: raw.saves,
        authorFollowers: raw.authorFollowers,
        authorMedianViews: raw.authorMedianViews,
        publishedAt: raw.publishedAt,
      },
      now,
    );

    const data = {
      source: raw.source,
      isDemo: raw.isDemo,
      externalId: raw.externalId,
      url: raw.url,
      authorHandle: raw.authorHandle,
      authorFollowers: raw.authorFollowers,
      authorMedianViews: raw.authorMedianViews,
      title: raw.title,
      caption: raw.caption,
      hashtags: raw.hashtags,
      durationSec: raw.durationSec,
      thumbnailUrl: raw.thumbnailUrl,
      publishedAt: raw.publishedAt,
      views: raw.views,
      likes: raw.likes,
      comments: raw.comments,
      shares: raw.shares,
      saves: raw.saves,
      viralScore: scoring.viralScore,
      scoreBreakdown:
        scoring.scoreBreakdown as unknown as Prisma.InputJsonValue,
      relativePerformance: scoring.relativePerformance,
      status: scoring.status,
      scoredAt: now,
    };

    // Upsert, never create-or-duplicate — re-running discovery on content
    // that's already known must update its numbers, not insert a sibling row.
    await this.prisma.trend.upsert({
      where: {
        source_externalId: { source: raw.source, externalId: raw.externalId },
      },
      create: data,
      update: data,
    });
  }
}
