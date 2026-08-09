import { TrendSource } from '@prisma/client';

/**
 * Platform-neutral shape a discovery source must produce. Deliberately has
 * no field that only one platform could fill — a provider that can't supply
 * a value (e.g. no median-views baseline) sends `null`, it doesn't invent one.
 */
export type RawTrend = {
  source: TrendSource;
  isDemo: boolean;
  externalId: string;
  url: string;

  authorHandle: string;
  authorFollowers: number;
  authorMedianViews: number | null;

  title: string;
  caption?: string;
  hashtags: string[];
  durationSec: number;
  thumbnailUrl?: string;
  publishedAt: Date;

  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
};

export type TrendDiscoveryQuery = {
  limit?: number;
};

/**
 * One implementation per discovery source (mock today, YouTube in Phase 4).
 * `TrendDiscoveryService` iterates every provider where `isAvailable` is
 * true — swapping or adding a source is a new class + one registration,
 * never a change to the discovery/scoring/recommendation pipeline.
 *
 * `id` identifies the *provider*, not a single platform — MockTrendProvider
 * returns rows tagged with several different `RawTrend.source` values (for a
 * realistic multi-platform Discover feed) while itself being one provider.
 * A future YoutubeTrendProvider would have `id: 'youtube'` and every row's
 * `source` would be `'YOUTUBE'`, but the two concepts aren't the same field.
 */
export interface TrendSourceProvider {
  readonly id: string;
  readonly isAvailable: boolean;
  discover(query: TrendDiscoveryQuery): Promise<RawTrend[]>;
}

export const TREND_SOURCE_PROVIDERS = 'TREND_SOURCE_PROVIDERS';
