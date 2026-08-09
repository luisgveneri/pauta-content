import { Injectable } from '@nestjs/common';
import { TrendStatus } from '@prisma/client';

export type ScoringInput = {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  authorFollowers: number;
  authorMedianViews: number | null;
  publishedAt: Date;
};

export type ScoreComponent = {
  key:
    | 'relativePerformance'
    | 'engagement'
    | 'velocity'
    | 'freshness'
    | 'amplification';
  label: string;
  raw: number;
  normalized: number;
  weight: number;
  contribution: number;
};

export type ScoreBreakdown = {
  components: ScoreComponent[];
  total: number;
};

export type ScoringResult = {
  viralScore: number;
  relativePerformance: number;
  scoreBreakdown: ScoreBreakdown;
  status: TrendStatus;
};

// Every weight and saturation point lives here, in one exported object, so
// the score is configurable and each component is independently
// unit-testable — see the Viral Intelligence plan's "explainable,
// configurable, testable" scoring goal. Weights sum to 1.
export const SCORE_WEIGHTS = {
  relativePerformance: 0.35,
  engagement: 0.2,
  velocity: 0.15,
  freshness: 0.1,
  amplification: 0.2,
};

// The raw ratio/rate that maps to a normalized component score of 1.0 —
// picked so a genuinely exceptional post saturates, not the average one.
const RELATIVE_PERFORMANCE_SATURATION = 20; // 20x the account's usual views
const VELOCITY_SATURATION = 5; // 5 "median videos" worth of views per day, account-relative
const ENGAGEMENT_SATURATION = 0.15; // 15% of viewers liking/commenting/sharing/saving
const AMPLIFICATION_SATURATION = 0.08; // 8% of viewers sharing or saving
const FRESHNESS_HALF_LIFE_DAYS = 10;

// Guards against a divide-by-near-zero velocity spike on same-day posts.
const MIN_AGE_DAYS = 0.25;

function logNormalize(raw: number, saturation: number): number {
  if (raw <= 0) return 0;
  return Math.min(1, Math.log10(raw + 1) / Math.log10(saturation + 1));
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Exported so RecommendationService's freshness component decays on the exact same curve as the trend's own score. */
export function freshnessScore(ageDays: number): number {
  return Math.exp((-Math.LN2 * ageDays) / FRESHNESS_HALF_LIFE_DAYS);
}

@Injectable()
export class TrendScoringService {
  score(input: ScoringInput, now: Date = new Date()): ScoringResult {
    const ageDays = Math.max(
      MIN_AGE_DAYS,
      (now.getTime() - input.publishedAt.getTime()) / 86_400_000,
    );

    // authorMedianViews is the real baseline; a raw follower count is a
    // reasonable fallback when the source can't supply one, but never a
    // silent substitute — callers can tell them apart via authorMedianViews.
    const baseline =
      input.authorMedianViews ??
      (input.authorFollowers > 0 ? input.authorFollowers : null);

    const relativePerformanceRaw =
      baseline && baseline > 0 ? input.views / baseline : 0;
    const totalInteractions =
      input.likes + input.comments + input.shares + input.saves;
    const engagementRaw = input.views > 0 ? totalInteractions / input.views : 0;
    const amplificationRaw =
      input.views > 0 ? (input.shares + input.saves) / input.views : 0;
    // Views/day expressed in "baseline videos per day" — not raw views/day,
    // which would let a huge account's absolute volume dominate velocity
    // regardless of whether the post is unusual *for that account*. That
    // would undercut the whole "views aren't virality" premise of this
    // module, so velocity stays account-relative like everything else.
    const velocityRaw =
      baseline && baseline > 0 ? input.views / ageDays / baseline : 0;

    const components: ScoreComponent[] = [
      this.component(
        'relativePerformance',
        "Performance vs. this account's usual reach",
        relativePerformanceRaw,
        logNormalize(relativePerformanceRaw, RELATIVE_PERFORMANCE_SATURATION),
        SCORE_WEIGHTS.relativePerformance,
      ),
      this.component(
        'engagement',
        'Engagement rate',
        engagementRaw,
        clamp01(engagementRaw / ENGAGEMENT_SATURATION),
        SCORE_WEIGHTS.engagement,
      ),
      this.component(
        'velocity',
        'Views velocity vs. account baseline',
        velocityRaw,
        logNormalize(velocityRaw, VELOCITY_SATURATION),
        SCORE_WEIGHTS.velocity,
      ),
      this.component(
        'freshness',
        'Freshness',
        ageDays,
        freshnessScore(ageDays),
        SCORE_WEIGHTS.freshness,
      ),
      this.component(
        'amplification',
        'Shares & saves rate',
        amplificationRaw,
        clamp01(amplificationRaw / AMPLIFICATION_SATURATION),
        SCORE_WEIGHTS.amplification,
      ),
    ];

    const total = Math.round(
      clamp01(components.reduce((sum, c) => sum + c.contribution, 0)) * 100,
    );
    const velocityComponent = components.find((c) => c.key === 'velocity');

    return {
      viralScore: total,
      relativePerformance: relativePerformanceRaw,
      scoreBreakdown: { components, total },
      status: this.deriveStatus(ageDays, velocityComponent?.normalized ?? 0),
    };
  }

  private component(
    key: ScoreComponent['key'],
    label: string,
    raw: number,
    normalized: number,
    weight: number,
  ): ScoreComponent {
    const n = clamp01(normalized);
    return { key, label, raw, normalized: n, weight, contribution: n * weight };
  }

  /**
   * A first classification from age + velocity alone, on the trend's single
   * discovery pass. Real state *transitions* (RISING -> HOT -> DECLINING as
   * the same trend gets re-scored over time) need periodic re-discovery,
   * which doesn't exist until Phase 4 — this is a reasonable initial label,
   * not a lifecycle state machine yet.
   */
  private deriveStatus(
    ageDays: number,
    velocityNormalized: number,
  ): TrendStatus {
    if (ageDays <= 2) return 'NEW';
    if (ageDays <= 10) return velocityNormalized >= 0.5 ? 'HOT' : 'RISING';
    if (ageDays <= 45) return 'STABLE';
    return 'DECLINING';
  }
}
