import { Injectable } from '@nestjs/common';
import { MOCK_TREND_SEED } from './mock-trend-data';
import {
  RawTrend,
  TrendDiscoveryQuery,
  TrendSourceProvider,
} from './trend-source-provider';

function urlFor(source: string, handle: string, externalId: string): string {
  const cleanHandle = handle.replace(/^@/, '');
  if (source === 'TIKTOK')
    return `https://www.tiktok.com/@${cleanHandle}/video/${externalId}`;
  if (source === 'INSTAGRAM')
    return `https://www.instagram.com/reel/${externalId}`;
  return `https://www.youtube.com/watch?v=${externalId}`;
}

/**
 * The only provider the MVP ships with — see the Viral Intelligence plan's
 * external-source research: there is no commercially-eligible discovery API
 * for TikTok, and Instagram's hashtag search is capped at 30 tags/week with
 * no cross-account analytics. Every row here is demo content (`isDemo: true`)
 * standing in for what real discovery will return once YouTube (Phase 4)
 * or another source lands — never presented as real platform data.
 */
@Injectable()
export class MockTrendProvider implements TrendSourceProvider {
  readonly id = 'mock';
  readonly isAvailable = true;

  discover(query: TrendDiscoveryQuery): Promise<RawTrend[]> {
    const limit = query.limit ?? MOCK_TREND_SEED.length;
    return Promise.resolve(
      MOCK_TREND_SEED.slice(0, limit).map((seed) => {
        const publishedAt = new Date(
          Date.now() - seed.ageDays * 24 * 60 * 60 * 1000,
        );
        return {
          source: seed.source,
          isDemo: true,
          externalId: seed.externalId,
          url: urlFor(seed.source, seed.authorHandle, seed.externalId),
          authorHandle: seed.authorHandle,
          authorFollowers: seed.authorFollowers,
          authorMedianViews: seed.authorMedianViews,
          title: seed.title,
          caption: seed.caption,
          hashtags: seed.hashtags,
          durationSec: seed.durationSec,
          publishedAt,
          views: seed.views,
          likes: seed.likes,
          comments: seed.comments,
          shares: seed.shares,
          saves: seed.saves,
        };
      }),
    );
  }
}
