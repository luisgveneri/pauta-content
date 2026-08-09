import { Injectable } from '@nestjs/common';
import {
  CampaignObjective,
  OrganizationType,
  Trend,
  TrendPattern,
} from '@prisma/client';
import {
  hashtagCountBucket,
  PerformanceService,
} from '../instagram/performance.service';
import { PrismaService } from '../prisma/prisma.service';
import { freshnessScore } from './trend-scoring.service';

export type PersonalizationLevel = 'full' | 'partial' | 'generic';

export type RecommendationComponentKey =
  | 'trendPerformance'
  | 'accountFit'
  | 'historicalFit'
  | 'contentGap'
  | 'freshness'
  | 'orgTypeFit';

export type RecommendationComponent = {
  key: RecommendationComponentKey;
  value: number;
  weight: number;
  reason: string | null;
};

export type RecommendationResult = {
  matchScore: number;
  personalizationLevel: PersonalizationLevel;
  reasons: string[];
  components: RecommendationComponent[];
};

export type ActiveCampaignContext = {
  name: string;
  keywords: string[];
};

export type RecommendationContext = {
  organizationType: OrganizationType;
  now: Date;
  personalizationLevel: PersonalizationLevel;
  // null (not zero) whenever there isn't enough Instagram history to judge
  // fit — see the plan's graceful-degradation rule: absence of data must
  // read as neutral, not as "this trend is a bad fit".
  hashtagLiftByBucket: Record<string, number> | null;
  topPerformingCaptionKeywords: Set<string> | null;
  recentContentKeywords: Set<string>;
  activeCampaign: ActiveCampaignContext | null;
};

export type ScoredTrend = {
  trend: Trend & { pattern: TrendPattern | null };
} & RecommendationResult;

// Weights sum to 1, same call as TrendScoringService — one place, configurable, testable.
const WEIGHTS: Record<RecommendationComponentKey, number> = {
  trendPerformance: 0.25,
  accountFit: 0.2,
  historicalFit: 0.15,
  contentGap: 0.15,
  freshness: 0.1,
  orgTypeFit: 0.15,
};

// A hashtag-count lift of 2x an account's baseline saturates the accountFit
// component — chosen the same way as TrendScoringService's saturation
// points, so a merely-average fit doesn't read as "no fit".
const ACCOUNT_FIT_LIFT_SATURATION = 2;
const MIN_POSTS_FOR_PERSONALIZATION = 5;
const RECENT_CONTENT_WINDOW_DAYS = 30;
const CANDIDATE_POOL_SIZE = 60;

const CLUB_KEYWORDS = [
  'club',
  'court',
  'courts',
  'booking',
  'tournament',
  'clinic',
  'team',
  'member',
  'members',
  'local',
  'recruit',
  'beginner',
  'lesson',
  'pricing',
  'referral',
];
const CREATOR_KEYWORDS = [
  'tips',
  'tip',
  'tutorial',
  'trick',
  'mistake',
  'mistakes',
  'technique',
  'review',
  'comedy',
  'humor',
  'funny',
  'story',
  'challenge',
  'pov',
];

const CAMPAIGN_KEYWORDS: Record<CampaignObjective, string[]> = {
  TOURNAMENT: [
    'tournament',
    'tourney',
    'championship',
    'compete',
    'competition',
    'match',
  ],
  CLINIC: ['clinic', 'lesson', 'class', 'training', 'coach', 'coaching'],
  TEAM_RECRUITMENT: [
    'team',
    'recruit',
    'recruiting',
    'join',
    'tryout',
    'tryouts',
  ],
  OTHER: [],
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

function keywordsOf(
  trend: Pick<Trend, 'title' | 'hashtags'> & {
    pattern?: Pick<TrendPattern, 'topic'> | null;
  },
): string[] {
  const words = new Set<string>();
  for (const w of tokenize(trend.title)) words.add(w);
  for (const hashtag of trend.hashtags)
    for (const w of tokenize(hashtag)) words.add(w);
  if (trend.pattern?.topic)
    for (const w of tokenize(trend.pattern.topic)) words.add(w);
  return [...words];
}

function overlapRatio(words: string[], reference: Set<string>): number {
  if (words.length === 0) return 0;
  return clamp01(words.filter((w) => reference.has(w)).length / words.length);
}

@Injectable()
export class RecommendationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly performance: PerformanceService,
  ) {}

  async getRecommendations(
    organizationId: string,
    organizationType: OrganizationType,
    limit = 12,
  ) {
    const context = await this.buildContext(organizationId, organizationType);

    // Bounded candidate set — global ranking already did the expensive part
    // at discovery time, so personalization only has to re-rank the trends
    // that were already promising, not every trend ever seen.
    const candidates = await this.prisma.trend.findMany({
      orderBy: { viralScore: 'desc' },
      take: CANDIDATE_POOL_SIZE,
      include: { pattern: true },
    });

    const scored: ScoredTrend[] = candidates.map((trend) => ({
      trend,
      ...this.score(trend, context),
    }));
    scored.sort((a, b) => b.matchScore - a.matchScore);

    return {
      personalizationLevel: context.personalizationLevel,
      recommendations: scored.slice(0, limit),
    };
  }

  /** Pure — no I/O — so ranking, degradation, and CLUB-vs-CREATOR behavior are unit-testable without a database. */
  score(
    trend: Trend & { pattern: TrendPattern | null },
    context: RecommendationContext,
  ): RecommendationResult {
    const ageDays = Math.max(
      0.25,
      (context.now.getTime() - trend.publishedAt.getTime()) / 86_400_000,
    );
    const trendKeywords = keywordsOf(trend);

    const trendPerformanceValue = clamp01(trend.viralScore / 100);

    const bucket = hashtagCountBucket(trend.hashtags.length);
    const accountFitValue = context.hashtagLiftByBucket
      ? clamp01(
          (context.hashtagLiftByBucket[bucket] ?? 1) /
            ACCOUNT_FIT_LIFT_SATURATION,
        )
      : 0.5;

    const historicalFitValue = context.topPerformingCaptionKeywords
      ? overlapRatio(trendKeywords, context.topPerformingCaptionKeywords)
      : 0.5;

    const coveredRecently = trendKeywords.some((w) =>
      context.recentContentKeywords.has(w),
    );
    const contentGapValue = coveredRecently ? 0.2 : 1;

    const freshnessValue = freshnessScore(ageDays);

    const matchesCampaign = context.activeCampaign
      ? trendKeywords.some((w) => context.activeCampaign!.keywords.includes(w))
      : false;
    const orgKeywords =
      context.organizationType === 'CLUB' ? CLUB_KEYWORDS : CREATOR_KEYWORDS;
    const matchesOrgType = trendKeywords.some((w) => orgKeywords.includes(w));
    const orgTypeFitValue = matchesCampaign ? 1 : matchesOrgType ? 0.75 : 0.4;

    const components: RecommendationComponent[] = [
      {
        key: 'trendPerformance',
        value: trendPerformanceValue,
        weight: WEIGHTS.trendPerformance,
        reason:
          trendPerformanceValue >= 0.7
            ? 'This format is performing strongly right now'
            : null,
      },
      {
        key: 'accountFit',
        value: accountFitValue,
        weight: WEIGHTS.accountFit,
        reason:
          context.hashtagLiftByBucket && accountFitValue >= 0.7
            ? "Similar posts run above your account's baseline"
            : null,
      },
      {
        key: 'historicalFit',
        value: historicalFitValue,
        weight: WEIGHTS.historicalFit,
        reason:
          context.topPerformingCaptionKeywords && historicalFitValue >= 0.34
            ? 'Similar to your top-performing content'
            : null,
      },
      {
        key: 'contentGap',
        value: contentGapValue,
        weight: WEIGHTS.contentGap,
        reason: !coveredRecently ? "You haven't covered this recently" : null,
      },
      {
        key: 'freshness',
        value: freshnessValue,
        weight: WEIGHTS.freshness,
        reason:
          ageDays <= 7
            ? `This trend is ${Math.max(1, Math.round(ageDays))} day${ageDays >= 1.5 ? 's' : ''} old`
            : null,
      },
      {
        key: 'orgTypeFit',
        value: orgTypeFitValue,
        weight: WEIGHTS.orgTypeFit,
        reason: matchesCampaign
          ? `Fits your active ${context.activeCampaign!.name} campaign`
          : matchesOrgType
            ? context.organizationType === 'CLUB'
              ? 'Matches what tends to work for padel clubs'
              : 'Matches what tends to work for content creators'
            : null,
      },
    ];

    const matchScore = Math.round(
      clamp01(components.reduce((sum, c) => sum + c.value * c.weight, 0)) * 100,
    );
    const reasons = components
      .map((c) => c.reason)
      .filter((r): r is string => r !== null);

    return {
      matchScore,
      personalizationLevel: context.personalizationLevel,
      reasons,
      components,
    };
  }

  private async buildContext(
    organizationId: string,
    organizationType: OrganizationType,
  ): Promise<RecommendationContext> {
    const now = new Date();
    const since = new Date(
      now.getTime() - RECENT_CONTENT_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );

    const [account, recentPlannerItems, activeCampaign] = await Promise.all([
      this.prisma.instagramAccount.findFirst({ where: { organizationId } }),
      this.prisma.plannerItem.findMany({
        where: { organizationId, date: { gte: since } },
        select: { title: true },
      }),
      organizationType === 'CLUB'
        ? this.prisma.campaign.findFirst({
            where: { organizationId, eventEndDate: { gte: now } },
            orderBy: { eventStartDate: 'asc' },
          })
        : Promise.resolve(null),
    ]);

    let hashtagLiftByBucket: Record<string, number> | null = null;
    let topPerformingCaptionKeywords: Set<string> | null = null;
    let recentInstagramCaptions: string[] = [];
    let personalizationLevel: PersonalizationLevel =
      recentPlannerItems.length > 0 ? 'partial' : 'generic';

    if (account) {
      const posts = await this.prisma.instagramPost.findMany({
        where: { accountId: account.id },
      });
      const latestSnapshot =
        await this.prisma.instagramAccountSnapshot.findFirst({
          where: { accountId: account.id },
          orderBy: { capturedAt: 'desc' },
        });

      const withInsights = posts.filter((p) => p.insightsSyncedAt !== null);
      recentInstagramCaptions = posts
        .filter((p) => p.postedAt >= since)
        .map((p) => p.caption ?? '');
      personalizationLevel =
        posts.length > 0 || recentPlannerItems.length > 0
          ? 'partial'
          : 'generic';

      if (withInsights.length >= MIN_POSTS_FOR_PERSONALIZATION) {
        const analysis = this.performance.analyze(
          withInsights.map((p) => ({
            id: p.id,
            mediaType: p.mediaType,
            reach: p.reach,
            totalInteractions: p.totalInteractions,
            postedHour: p.postedHour,
            postedDow: p.postedDow,
            captionLength: p.captionLength,
            hashtagCount: p.hashtagCount,
          })),
          latestSnapshot?.followersCount ?? 0,
        );
        hashtagLiftByBucket = Object.fromEntries(
          analysis.segments.byHashtagCount.map((s) => [s.segment, s.lift]),
        );

        const performanceByPostId = new Map(
          analysis.posts.map((p) => [p.postId, p]),
        );
        const topPosts = [...withInsights]
          .sort(
            (a, b) =>
              (performanceByPostId.get(b.id)?.performanceIndex ?? 0) -
              (performanceByPostId.get(a.id)?.performanceIndex ?? 0),
          )
          .slice(0, 10);
        topPerformingCaptionKeywords = new Set(
          topPosts.flatMap((p) => tokenize(p.caption ?? '')),
        );

        personalizationLevel = 'full';
      }
    }

    const recentContentKeywords = new Set([
      ...recentPlannerItems.flatMap((i) => tokenize(i.title)),
      ...recentInstagramCaptions.flatMap((c) => tokenize(c)),
    ]);

    return {
      organizationType,
      now,
      personalizationLevel,
      hashtagLiftByBucket,
      topPerformingCaptionKeywords,
      recentContentKeywords,
      activeCampaign: activeCampaign
        ? {
            name: activeCampaign.name,
            keywords: CAMPAIGN_KEYWORDS[activeCampaign.objective],
          }
        : null,
    };
  }
}
