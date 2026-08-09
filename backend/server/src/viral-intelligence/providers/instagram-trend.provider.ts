import { Injectable, Logger } from '@nestjs/common';
import { InstagramApiService } from '../../instagram/instagram-api.service';
import {
  GraphBusinessDiscovery,
  GraphMedia,
} from '../../instagram/instagram-api.types';
import { decryptToken } from '../../instagram/token-crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MonitoredAccountsService } from '../monitored-accounts.service';
import { RawTrend, TrendSourceProvider } from './trend-source-provider';

const MEDIA_PER_ACCOUNT = 12;
// Business Discovery is Platform-rate-limited, not Business-Use-Case-limited,
// but a small delay between accounts is still cheap insurance against
// bursting — same call as InstagramTokenService's between-account pacing.
const BETWEEN_ACCOUNTS_DELAY_MS = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function extractHashtags(caption: string | undefined): string[] {
  if (!caption) return [];
  return [...caption.matchAll(/#(\w+)/g)].map((m) => m[1]);
}

function titleFromCaption(
  caption: string | undefined,
  username: string,
): string {
  const firstLine = caption?.split('\n')[0]?.trim();
  if (firstLine && firstLine.length > 0) return firstLine.slice(0, 160);
  return `Video de @${username}`;
}

/**
 * Real Instagram Reels from a curated, org-managed watchlist (see
 * MonitoredAccountsService) via the Business Discovery endpoint — the one
 * discovery path that works today without Meta App Review. Hashtag Search
 * (broad discovery by topic) is still blocked pending review; see
 * docs/viral-intelligence.md for the full picture and why this is the
 * source that ships first.
 */
@Injectable()
export class InstagramTrendProvider implements TrendSourceProvider {
  private readonly logger = new Logger(InstagramTrendProvider.name);
  readonly id = 'instagram-business-discovery';
  readonly isAvailable = true; // structural — discover() itself no-ops gracefully if no connected account exists
  readonly isDemoSource = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly api: InstagramApiService,
    private readonly monitoredAccounts: MonitoredAccountsService,
  ) {}

  async discover(): Promise<RawTrend[]> {
    // Business Discovery needs *a* connected, healthy Instagram Business
    // account to make the call as — it doesn't matter whose, since the
    // response describes the target account, not the caller. Any org's
    // healthy connection unblocks discovery for every org's watchlist.
    const caller = await this.prisma.instagramAccount.findFirst({
      where: { needsReconnect: false },
    });
    if (!caller) {
      this.logger.warn(
        'No hay ninguna cuenta de Instagram conectada y sana — no se puede sincronizar.',
      );
      return [];
    }

    const token = decryptToken(caller.accessTokenEnc);
    const usernames = await this.monitoredAccounts.listDistinctUsernames();
    const results: RawTrend[] = [];

    for (const username of usernames) {
      try {
        const discovery = await this.api.getBusinessDiscovery(
          caller.igUserId,
          username,
          token,
          MEDIA_PER_ACCOUNT,
        );
        results.push(...this.toRawTrends(username, discovery));
        await this.monitoredAccounts.recordSyncResult(username, null);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Business Discovery falló para @${username}: ${message}`,
        );
        await this.monitoredAccounts.recordSyncResult(username, message);
      }
      await sleep(BETWEEN_ACCOUNTS_DELAY_MS);
    }

    return results;
  }

  private toRawTrends(
    username: string,
    discovery: GraphBusinessDiscovery,
  ): RawTrend[] {
    // Video-only, deliberately: the whole product (durationSec, editing
    // style, pacing, script adaptation) is a short-form-video concept, and
    // Business Discovery doesn't expose view_count for images/carousels
    // anyway — there'd be no honest way to score them against video trends.
    const videos = (discovery.media?.data ?? []).filter(
      (m): m is GraphMedia & { view_count: number } =>
        m.media_type === 'VIDEO' && typeof m.view_count === 'number',
    );
    if (videos.length === 0) return [];

    const authorMedianViews = median(videos.map((m) => m.view_count));

    return videos.map((m) => ({
      source: 'INSTAGRAM' as const,
      isDemo: false,
      externalId: m.id,
      url: m.permalink,
      authorHandle: username,
      authorFollowers: discovery.followers_count,
      authorMedianViews,
      title: titleFromCaption(m.caption, username),
      caption: m.caption,
      hashtags: extractHashtags(m.caption),
      durationSec: undefined, // Business Discovery never exposes video length, for any account
      thumbnailUrl: m.thumbnail_url,
      publishedAt: new Date(m.timestamp),
      views: m.view_count,
      likes: m.like_count ?? 0,
      comments: m.comments_count ?? 0,
      // Never exposed for accounts you don't own — left at 0 (not guessed);
      // the amplification score component just contributes nothing here.
      shares: 0,
      saves: 0,
    }));
  }
}
