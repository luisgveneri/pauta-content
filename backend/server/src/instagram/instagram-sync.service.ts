import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GraphApiError, InstagramApiService } from './instagram-api.service';
import { decryptToken, encryptToken } from './token-crypto';

// business_management deliberately excluded — it's not enabled for this app
// in the Meta dashboard (Invalid Scopes error), and isn't strictly needed:
// the manual pageId override in resolvePage() already covers Business
// Portfolio-owned Pages without it.
const OAUTH_SCOPES = ['instagram_basic', 'instagram_manage_insights', 'pages_show_list', 'pages_read_engagement'].join(
  ',',
);

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

type OAuthState = { organizationId: string; exp: number };

const INSIGHTS_LOOKBACK_DAYS = 90;
const INSIGHTS_STALE_AFTER_MS = 12 * 60 * 60 * 1000;
const MAX_INSIGHTS_CALLS_PER_SYNC = 100;
const INSIGHTS_CALL_DELAY_MS = 150;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function countHashtags(caption?: string | null): number {
  if (!caption) return 0;
  return (caption.match(/#[\p{L}0-9_]+/gu) ?? []).length;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

@Injectable()
export class InstagramSyncService {
  private readonly logger = new Logger(InstagramSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly api: InstagramApiService,
  ) {}

  async getAccount(organizationId: string) {
    return this.prisma.instagramAccount.findFirst({ where: { organizationId } });
  }

  async status(organizationId: string) {
    const account = await this.getAccount(organizationId);
    if (!account) return { connected: false as const };
    return {
      connected: true as const,
      username: account.username,
      igUserId: account.igUserId,
      needsReconnect: account.needsReconnect,
      tokenExpiresAt: account.tokenExpiresAt,
      lastSyncedAt: account.lastSyncedAt,
    };
  }

  /**
   * Connects an Instagram Business account from a user- or page-scoped token
   * pasted by the user. Exchanges it for a long-lived token, discovers the
   * linked Facebook Page + Instagram Business account, and prefers the
   * derived Page access token because (unlike a plain user token) it does
   * not expire while the underlying grant remains valid.
   */
  async connect(organizationId: string, rawToken: string, pageId?: string) {
    if (!rawToken || rawToken.trim().length < 20) {
      throw new BadRequestException('El token proporcionado no parece válido.');
    }

    let workingToken = rawToken.trim();
    try {
      const exchanged = await this.api.exchangeForLongLived(workingToken);
      workingToken = exchanged.accessToken;
    } catch (error) {
      this.logger.warn(`No se pudo intercambiar el token por uno de larga duración, se usará tal cual: ${(error as Error).message}`);
    }

    const page = await this.resolvePage(workingToken, pageId);
    if (!page || !page.instagram_business_account) {
      throw new BadRequestException(
        pageId
          ? 'No se encontró ninguna cuenta de Instagram Business/Creator vinculada a esa Página.'
          : 'No se encontró ninguna cuenta de Instagram Business/Creator vinculada a tus páginas de Facebook. Si tu Página pertenece a un Portfolio Empresarial, indica el ID de la Página manualmente.',
      );
    }

    const igUserId = page.instagram_business_account.id;
    const pageToken = page.access_token;
    const igAccount = await this.api.getAccount(igUserId, pageToken);

    const existing = await this.prisma.instagramAccount.findUnique({ where: { igUserId } });
    if (existing && existing.organizationId !== organizationId) {
      throw new ConflictException(
        'Esta cuenta de Instagram ya está conectada a otra organización. Desconéctala ahí primero.',
      );
    }

    const accessTokenEnc = encryptToken(pageToken);
    const account = await this.prisma.instagramAccount.upsert({
      where: { igUserId },
      create: {
        organizationId,
        igUserId,
        username: igAccount.username,
        pageId: page.id,
        accessTokenEnc,
        tokenExpiresAt: null,
        needsReconnect: false,
      },
      update: {
        username: igAccount.username,
        pageId: page.id,
        accessTokenEnc,
        tokenExpiresAt: null,
        needsReconnect: false,
      },
    });

    return { connected: true as const, username: account.username, igUserId: account.igUserId };
  }

  async disconnect(organizationId: string) {
    await this.prisma.instagramAccount.deleteMany({ where: { organizationId } });
    return { connected: false as const };
  }

  /**
   * Builds the Meta authorize URL for `organizationId`. The `state` param
   * carries the org id encrypted (via the same AES-GCM utility used for
   * stored tokens) with a short expiry — this is what lets the public
   * callback know which org to attach the connection to without trusting a
   * client-supplied id (IDOR) or requiring an Authorization header on what
   * is a plain browser navigation, not an XHR.
   */
  buildAuthorizeUrl(organizationId: string): string {
    const state: OAuthState = { organizationId, exp: Date.now() + OAUTH_STATE_TTL_MS };
    const params = new URLSearchParams({
      client_id: process.env.IG_APP_ID || '',
      redirect_uri: process.env.INSTAGRAM_OAUTH_REDIRECT_URI || '',
      state: encryptToken(JSON.stringify(state)),
      scope: OAUTH_SCOPES,
      response_type: 'code',
    });
    const apiVersion = process.env.IG_API_VERSION || 'v23.0';
    return `https://www.facebook.com/${apiVersion}/dialog/oauth?${params.toString()}`;
  }

  /** Decrypts + validates the `state` round-tripped from Meta. Throws on tampering or expiry — never partial-trusts it. */
  verifyOAuthState(state: string): OAuthState {
    let parsed: OAuthState;
    try {
      parsed = JSON.parse(decryptToken(state));
    } catch {
      throw new BadRequestException('El parámetro state de OAuth no es válido.');
    }
    if (!parsed.organizationId || !parsed.exp || parsed.exp < Date.now()) {
      throw new BadRequestException('El enlace de conexión ha caducado. Vuelve a intentarlo.');
    }
    return parsed;
  }

  /**
   * Resolves the Facebook Page to connect. Prefers a directly-provided
   * pageId (fetched by id, which works even for Business-Portfolio-owned
   * Pages where `/me/accounts` returns an empty list under "Facebook Login
   * for Business" tokens). Falls back to `/me/accounts` discovery otherwise.
   */
  private async resolvePage(token: string, pageId?: string) {
    if (pageId) {
      return this.api.getPage(pageId.trim(), token);
    }
    const pages = await this.api.listPages(token);
    const page = pages.find((p) => p.instagram_business_account);
    if (page) return page;

    // `/me/accounts` comes back empty for Business-Portfolio-owned Pages even
    // when the token can access them directly by id — the manual-paste flow
    // covers this with an optional pageId field, but the OAuth redirect flow
    // has no step where the user could supply one. FACEBOOK_PAGE_ID is a
    // last-resort fallback for exactly that case (single known Page for now).
    const fallbackPageId = process.env.FACEBOOK_PAGE_ID;
    if (fallbackPageId) {
      return this.api.getPage(fallbackPageId.trim(), token);
    }
    return undefined;
  }

  async sync(organizationId: string) {
    const account = await this.getAccount(organizationId);
    if (!account) {
      throw new NotFoundException('No hay ninguna cuenta de Instagram conectada.');
    }

    const token = decryptToken(account.accessTokenEnc);
    const now = new Date();

    let freshAccount, accountInsights;
    try {
      [freshAccount, accountInsights] = await Promise.all([
        this.api.getAccount(account.igUserId, token),
        this.api.getAccountInsights(account.igUserId, token),
      ]);
    } catch (error) {
      if (this.isAuthError(error)) {
        await this.prisma.instagramAccount.update({
          where: { id: account.id },
          data: { needsReconnect: true },
        });
        throw new BadRequestException(
          'El token de Instagram ha caducado. Reconéctalo con un token nuevo desde el Explorador de la API Graph.',
        );
      }
      throw error;
    }

    await this.prisma.instagramAccountSnapshot.upsert({
      where: { accountId_capturedAt: { accountId: account.id, capturedAt: startOfUtcDay(now) } },
      create: {
        accountId: account.id,
        capturedAt: startOfUtcDay(now),
        followersCount: freshAccount.followers_count,
        followsCount: freshAccount.follows_count,
        mediaCount: freshAccount.media_count,
        reachDay: accountInsights.reach,
        profileViewsDay: accountInsights.profileViews,
        accountsEngagedDay: accountInsights.accountsEngaged,
      },
      update: {
        followersCount: freshAccount.followers_count,
        followsCount: freshAccount.follows_count,
        mediaCount: freshAccount.media_count,
        reachDay: accountInsights.reach,
        profileViewsDay: accountInsights.profileViews,
        accountsEngagedDay: accountInsights.accountsEngaged,
      },
    });

    const since = account.lastSyncedAt
      ? new Date(account.lastSyncedAt.getTime() - 2 * 24 * 60 * 60 * 1000)
      : undefined;
    const media = await this.api.listMedia(account.igUserId, token, since);

    let postsUpserted = 0;
    for (const item of media) {
      const postedAt = new Date(item.timestamp);
      await this.prisma.instagramPost.upsert({
        where: { igMediaId: item.id },
        create: {
          accountId: account.id,
          igMediaId: item.id,
          caption: item.caption ?? null,
          mediaType: item.media_type,
          mediaProductType: item.media_product_type ?? null,
          permalink: item.permalink,
          mediaUrl: item.media_url ?? null,
          thumbnailUrl: item.thumbnail_url ?? null,
          postedAt,
          likeCount: item.like_count ?? 0,
          commentsCount: item.comments_count ?? 0,
          captionLength: item.caption?.length ?? 0,
          hashtagCount: countHashtags(item.caption),
          postedHour: postedAt.getHours(),
          postedDow: postedAt.getDay(),
        },
        update: {
          caption: item.caption ?? null,
          likeCount: item.like_count ?? 0,
          commentsCount: item.comments_count ?? 0,
          captionLength: item.caption?.length ?? 0,
          hashtagCount: countHashtags(item.caption),
        },
      });
      postsUpserted += 1;
    }

    const insightsCutoff = new Date(now.getTime() - INSIGHTS_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const staleCutoff = new Date(now.getTime() - INSIGHTS_STALE_AFTER_MS);
    const postsNeedingInsights = await this.prisma.instagramPost.findMany({
      where: {
        accountId: account.id,
        postedAt: { gte: insightsCutoff },
        OR: [{ insightsSyncedAt: null }, { insightsSyncedAt: { lt: staleCutoff } }],
      },
      orderBy: { postedAt: 'desc' },
      take: MAX_INSIGHTS_CALLS_PER_SYNC,
    });

    let insightsSynced = 0;
    for (const post of postsNeedingInsights) {
      const insights = await this.api.getMediaInsights(post.igMediaId, post.mediaType, token);
      await this.prisma.$transaction([
        this.prisma.instagramPost.update({
          where: { id: post.id },
          data: {
            reach: insights.reach,
            views: insights.views,
            saved: insights.saved,
            shares: insights.shares,
            totalInteractions: insights.totalInteractions,
            avgWatchTimeMs: insights.avgWatchTimeMs ?? null,
            likeCount: insights.likes || post.likeCount,
            commentsCount: insights.comments || post.commentsCount,
            insightsSyncedAt: now,
          },
        }),
        this.prisma.instagramPostMetric.create({
          data: {
            postId: post.id,
            capturedAt: now,
            likeCount: insights.likes || post.likeCount,
            commentsCount: insights.comments || post.commentsCount,
            reach: insights.reach,
            views: insights.views,
            saved: insights.saved,
            shares: insights.shares,
            totalInteractions: insights.totalInteractions,
          },
        }),
      ]);
      insightsSynced += 1;
      await sleep(INSIGHTS_CALL_DELAY_MS);
    }

    await this.prisma.instagramAccount.update({
      where: { id: account.id },
      data: { lastSyncedAt: now, needsReconnect: false },
    });

    return { postsUpserted, insightsSynced, syncedAt: now };
  }

  /** Re-throws GraphApiError as-is so callers/controllers can inspect status; used by token service too. */
  isAuthError(error: unknown): boolean {
    return error instanceof GraphApiError && error.code === 190;
  }
}
