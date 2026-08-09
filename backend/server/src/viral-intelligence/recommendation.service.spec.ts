import { Trend, TrendPattern } from '@prisma/client';
import { PerformanceService } from '../instagram/performance.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  RecommendationContext,
  RecommendationService,
} from './recommendation.service';

describe('RecommendationService', () => {
  let service: RecommendationService;
  const now = new Date('2026-08-09T00:00:00.000Z');

  beforeEach(() => {
    // score() is pure and never touches Prisma/PerformanceService, so the
    // constructor dependencies only need to exist, not behave — every test
    // below calls service.score() directly.
    service = new RecommendationService(
      {} as PrismaService,
      new PerformanceService(),
    );
  });

  function daysAgo(days: number): Date {
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  }

  function buildTrend(
    overrides: Partial<Trend> = {},
    pattern: Partial<TrendPattern> | null = null,
  ): Trend & { pattern: TrendPattern | null } {
    const trend: Trend = {
      id: 't1',
      source: 'TIKTOK',
      isDemo: true,
      externalId: 'ext-1',
      url: 'https://example.com',
      authorHandle: '@example',
      authorFollowers: 10_000,
      authorMedianViews: 10_000,
      title: '3 mistakes beginners make in padel',
      caption: null,
      hashtags: ['padel', 'padeltips'],
      durationSec: 28,
      thumbnailUrl: null,
      publishedAt: daysAgo(3),
      views: 100_000,
      likes: 8_000,
      comments: 300,
      shares: 900,
      saves: 2_000,
      viralScore: 70,
      scoreBreakdown: null,
      relativePerformance: 10,
      status: 'RISING',
      scoredAt: now,
      fingerprint: null,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };

    const fullPattern: TrendPattern | null = pattern
      ? {
          id: 'p1',
          trendId: trend.id,
          model: 'test',
          payload: {},
          format: 'educational_list',
          topic: 'padel',
          emotion: 'curiosity',
          ctaType: 'save',
          createdAt: now,
          ...pattern,
        }
      : null;

    return { ...trend, pattern: fullPattern };
  }

  function buildContext(
    overrides: Partial<RecommendationContext> = {},
  ): RecommendationContext {
    return {
      organizationType: 'CREATOR',
      now,
      personalizationLevel: 'generic',
      hashtagLiftByBucket: null,
      topPerformingCaptionKeywords: null,
      recentContentKeywords: new Set(),
      activeCampaign: null,
      ...overrides,
    };
  }

  it('ranks a high viral-score, fresh trend above a low viral-score, stale one', () => {
    const strong = service.score(
      buildTrend({ viralScore: 90, publishedAt: daysAgo(1) }),
      buildContext(),
    );
    const weak = service.score(
      buildTrend({ viralScore: 20, publishedAt: daysAgo(90) }),
      buildContext(),
    );

    expect(strong.matchScore).toBeGreaterThan(weak.matchScore);
  });

  it('degrades gracefully to neutral fit (not zero) when there is no Instagram data at all', () => {
    const context = buildContext({
      personalizationLevel: 'generic',
      hashtagLiftByBucket: null,
      topPerformingCaptionKeywords: null,
    });

    const result = service.score(buildTrend(), context);
    const accountFit = result.components.find((c) => c.key === 'accountFit')!;
    const historicalFit = result.components.find(
      (c) => c.key === 'historicalFit',
    )!;

    expect(accountFit.value).toBe(0.5);
    expect(historicalFit.value).toBe(0.5);
    expect(result.personalizationLevel).toBe('generic');
    // Neutral fit must not silently zero out the whole score.
    expect(result.matchScore).toBeGreaterThan(0);
  });

  it('rewards accounts whose hashtag-count bucket lift is above baseline, once real Instagram data exists', () => {
    const highLift = service.score(
      buildTrend({ hashtags: ['a', 'b'] }),
      buildContext({
        personalizationLevel: 'full',
        hashtagLiftByBucket: { '1-3': 2.4 },
      }),
    );
    const lowLift = service.score(
      buildTrend({ hashtags: ['a', 'b'] }),
      buildContext({
        personalizationLevel: 'full',
        hashtagLiftByBucket: { '1-3': 0.3 },
      }),
    );

    expect(highLift.matchScore).toBeGreaterThan(lowLift.matchScore);
  });

  it('scores the same trend differently for CLUB vs. CREATOR organizations', () => {
    const clubTrend = buildTrend({
      title: 'How we turned open house day into 30 new members',
      hashtags: ['padelclub', 'membergrowth'],
    });

    const asClub = service.score(
      clubTrend,
      buildContext({ organizationType: 'CLUB' }),
    );
    const asCreator = service.score(
      clubTrend,
      buildContext({ organizationType: 'CREATOR' }),
    );

    expect(asClub.matchScore).toBeGreaterThan(asCreator.matchScore);
    expect(asClub.reasons.some((r) => r.includes('padel clubs'))).toBe(true);
  });

  it("boosts a trend that matches the organization's active campaign, regardless of org type", () => {
    const tournamentTrend = buildTrend({
      title: 'Get ready for tournament weekend',
    });

    const withCampaign = service.score(
      tournamentTrend,
      buildContext({
        organizationType: 'CLUB',
        activeCampaign: { name: 'Summer Tournament', keywords: ['tournament'] },
      }),
    );
    const withoutCampaign = service.score(
      tournamentTrend,
      buildContext({ organizationType: 'CLUB', activeCampaign: null }),
    );

    expect(withCampaign.matchScore).toBeGreaterThan(withoutCampaign.matchScore);
    expect(
      withCampaign.reasons.some((r) => r.includes('Summer Tournament')),
    ).toBe(true);
  });

  it('penalizes content the organization has already covered recently', () => {
    const trend = buildTrend({
      title: 'Padel warm-up routine before a tournament',
      hashtags: ['padel', 'warmup'],
    });

    const fresh = service.score(
      trend,
      buildContext({ recentContentKeywords: new Set() }),
    );
    const alreadyCovered = service.score(
      trend,
      buildContext({ recentContentKeywords: new Set(['warmup']) }),
    );

    expect(fresh.matchScore).toBeGreaterThan(alreadyCovered.matchScore);
  });

  it('never returns a match score outside [0, 100]', () => {
    const best = service.score(
      buildTrend(
        {
          viralScore: 100,
          publishedAt: daysAgo(0.1),
          title: 'tournament clinic team club',
        },
        {},
      ),
      buildContext({
        organizationType: 'CLUB',
        hashtagLiftByBucket: { '1-3': 10 },
        topPerformingCaptionKeywords: new Set([
          'tournament',
          'clinic',
          'team',
          'club',
        ]),
        activeCampaign: { name: 'X', keywords: ['tournament'] },
      }),
    );
    const worst = service.score(
      buildTrend({
        viralScore: 0,
        publishedAt: daysAgo(500),
        title: 'unrelated content',
      }),
      buildContext(),
    );

    expect(best.matchScore).toBeLessThanOrEqual(100);
    expect(best.matchScore).toBeGreaterThanOrEqual(0);
    expect(worst.matchScore).toBeLessThanOrEqual(100);
    expect(worst.matchScore).toBeGreaterThanOrEqual(0);
  });
});
