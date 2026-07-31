import { Injectable, Logger } from '@nestjs/common';
import {
  AccountInsightsResult,
  GraphAccount,
  GraphMedia,
  GraphPage,
  InsightValue,
  MediaInsightsResult,
} from './instagram-api.types';

const UNSUPPORTED_METRIC_SUBCODE = 2108006;

export class GraphApiError extends Error {
  constructor(
    message: string,
    readonly code?: number,
    readonly subcode?: number,
  ) {
    super(message);
  }
}

/**
 * Thin, stateless wrapper around the Instagram Graph API. Takes the access
 * token as an argument on every call rather than holding state, so callers
 * (sync service) own token lookup/refresh.
 */
@Injectable()
export class InstagramApiService {
  private readonly logger = new Logger(InstagramApiService.name);

  private get baseUrl() {
    const version = process.env.IG_API_VERSION || 'v23.0';
    return `https://graph.facebook.com/${version}`;
  }

  async getAccount(igUserId: string, token: string): Promise<GraphAccount> {
    return this.get<GraphAccount>(`/${igUserId}`, {
      fields: 'id,username,followers_count,follows_count,media_count',
      access_token: token,
    });
  }

  async getAccountInsights(igUserId: string, token: string): Promise<AccountInsightsResult> {
    try {
      const res = await this.get<{ data: InsightValue[] }>(`/${igUserId}/insights`, {
        metric: 'reach,profile_views,accounts_engaged',
        metric_type: 'total_value',
        period: 'day',
        access_token: token,
      });
      const byName = this.indexInsightValues(res.data);
      return {
        reach: byName.get('reach') ?? 0,
        profileViews: byName.get('profile_views') ?? 0,
        accountsEngaged: byName.get('accounts_engaged') ?? 0,
      };
    } catch (error) {
      this.logger.warn(`No se pudieron obtener insights de cuenta: ${(error as Error).message}`);
      return { reach: 0, profileViews: 0, accountsEngaged: 0 };
    }
  }

  /**
   * Lists media for an account, newest first. When `since` is provided the
   * page stops as soon as a media item older than `since` is seen, so a
   * regular sync only pages through recent content instead of the full history.
   */
  async listMedia(igUserId: string, token: string, since?: Date): Promise<GraphMedia[]> {
    const results: GraphMedia[] = [];
    let url: string | undefined = this.buildUrl(`/${igUserId}/media`, {
      fields:
        'id,caption,media_type,media_product_type,permalink,media_url,thumbnail_url,timestamp,like_count,comments_count',
      limit: '50',
      access_token: token,
    });

    while (url) {
      const page: { data: GraphMedia[]; paging?: { next?: string } } = await this.fetchUrl(url);
      for (const item of page.data) {
        if (since && new Date(item.timestamp) < since) {
          return results;
        }
        results.push(item);
      }
      url = page.paging?.next;
    }
    return results;
  }

  /**
   * Fetches insights for one media item. Metric set depends on media type.
   * Unsupported-metric errors are treated as non-fatal: we fall back to
   * requesting each metric individually and keep whichever succeed.
   */
  async getMediaInsights(mediaId: string, mediaType: string, token: string): Promise<MediaInsightsResult> {
    const metrics = this.metricsForType(mediaType);
    try {
      const res = await this.get<{ data: InsightValue[] }>(`/${mediaId}/insights`, {
        metric: metrics.join(','),
        access_token: token,
      });
      return this.toMediaInsightsResult(res.data);
    } catch (error) {
      if (error instanceof GraphApiError && error.subcode === UNSUPPORTED_METRIC_SUBCODE) {
        return this.getMediaInsightsPerMetric(mediaId, metrics, token);
      }
      this.logger.warn(`Insights no disponibles para media ${mediaId}: ${(error as Error).message}`);
      return this.toMediaInsightsResult([]);
    }
  }

  /** First leg of the OAuth code exchange — trades the `code` from the authorize redirect for a short-lived user token. */
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<{ accessToken: string }> {
    const res = await this.get<{ access_token: string }>('/oauth/access_token', {
      client_id: process.env.IG_APP_ID || '',
      client_secret: process.env.IG_APP_SECRET || '',
      redirect_uri: redirectUri,
      code,
    });
    return { accessToken: res.access_token };
  }

  async exchangeForLongLived(shortLivedToken: string): Promise<{ accessToken: string; expiresInSec?: number }> {
    const res = await this.get<{ access_token: string; expires_in?: number }>('/oauth/access_token', {
      grant_type: 'fb_exchange_token',
      client_id: process.env.IG_APP_ID || '',
      client_secret: process.env.IG_APP_SECRET || '',
      fb_exchange_token: shortLivedToken,
    });
    return { accessToken: res.access_token, expiresInSec: res.expires_in };
  }

  async listPages(token: string): Promise<GraphPage[]> {
    const res = await this.get<{ data: GraphPage[] }>('/me/accounts', {
      fields: 'id,name,access_token,instagram_business_account{id,username}',
      access_token: token,
    });
    return res.data;
  }

  /**
   * Fetches a single Page by id, including its Page-scoped access token and
   * linked Instagram Business account. Used as a fallback when `/me/accounts`
   * returns an empty list — which happens with tokens issued via "Facebook
   * Login for Business" for Business-Portfolio-owned Pages, even though the
   * token does have access to the page when queried directly by id.
   */
  async getPage(pageId: string, token: string): Promise<GraphPage> {
    return this.get<GraphPage>(`/${pageId}`, {
      fields: 'id,name,access_token,instagram_business_account{id,username}',
      access_token: token,
    });
  }

  private async getMediaInsightsPerMetric(
    mediaId: string,
    metrics: string[],
    token: string,
  ): Promise<MediaInsightsResult> {
    const collected: InsightValue[] = [];
    for (const metric of metrics) {
      try {
        const res = await this.get<{ data: InsightValue[] }>(`/${mediaId}/insights`, {
          metric,
          access_token: token,
        });
        collected.push(...res.data);
      } catch {
        // metric genuinely unsupported for this media item — skip it
      }
    }
    return this.toMediaInsightsResult(collected);
  }

  private metricsForType(mediaType: string): string[] {
    const base = ['views', 'reach', 'likes', 'comments', 'shares', 'saved', 'total_interactions'];
    if (mediaType === 'REELS') {
      return [...base, 'ig_reels_avg_watch_time'];
    }
    return base;
  }

  private toMediaInsightsResult(values: InsightValue[]): MediaInsightsResult {
    const byName = this.indexInsightValues(values);
    return {
      views: byName.get('views') ?? 0,
      reach: byName.get('reach') ?? 0,
      likes: byName.get('likes') ?? 0,
      comments: byName.get('comments') ?? 0,
      shares: byName.get('shares') ?? 0,
      saved: byName.get('saved') ?? 0,
      totalInteractions: byName.get('total_interactions') ?? 0,
      avgWatchTimeMs: byName.has('ig_reels_avg_watch_time')
        ? Math.round((byName.get('ig_reels_avg_watch_time') ?? 0) * 1000)
        : undefined,
    };
  }

  private indexInsightValues(values: InsightValue[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const v of values) {
      const value = v.values?.[v.values.length - 1]?.value ?? 0;
      map.set(v.name, value);
    }
    return map;
  }

  private async get<T>(path: string, query: Record<string, string>): Promise<T> {
    return this.fetchUrl<T>(this.buildUrl(path, query));
  }

  private buildUrl(path: string, query: Record<string, string>): string {
    const url = new URL(path.startsWith('http') ? path : `${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  }

  private async fetchUrl<T>(url: string): Promise<T> {
    const response = await fetch(url);
    const body = await response.json();
    if (!response.ok || body.error) {
      const err = body.error ?? {};
      throw new GraphApiError(err.message || `Graph API error (${response.status})`, err.code, err.error_subcode);
    }
    return body as T;
  }
}
