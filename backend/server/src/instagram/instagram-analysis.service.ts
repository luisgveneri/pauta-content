import { Injectable, NotFoundException } from '@nestjs/common';
import { AiService, InstagramPostSummary, InstagramSegmentSummary } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { PerformanceService } from './performance.service';

const TOP_BOTTOM_COUNT = 10;
const CAPTION_TRUNCATE_LENGTH = 300;

@Injectable()
export class InstagramAnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly performance: PerformanceService,
    private readonly ai: AiService,
  ) {}

  async analyzeAccount(accountId: string) {
    const account = await this.prisma.instagramAccount.findUniqueOrThrow({ where: { id: accountId } });
    const posts = await this.prisma.instagramPost.findMany({ where: { accountId } });
    const latestSnapshot = await this.prisma.instagramAccountSnapshot.findFirst({
      where: { accountId },
      orderBy: { capturedAt: 'desc' },
    });

    const result = this.performance.analyze(this.withInsights(posts), latestSnapshot?.followersCount ?? 0);
    const performanceByPostId = new Map(result.posts.map((p) => [p.postId, p]));

    const ranked = [...posts].filter((p) => performanceByPostId.has(p.id)).sort(
      (a, b) => (performanceByPostId.get(b.id)?.performanceIndex ?? 0) - (performanceByPostId.get(a.id)?.performanceIndex ?? 0),
    );
    const topPosts = ranked.slice(0, TOP_BOTTOM_COUNT).map((p) => this.toSummary(p, performanceByPostId.get(p.id)?.engagementRate ?? 0));
    const bottomPosts = ranked
      .slice(-TOP_BOTTOM_COUNT)
      .reverse()
      .map((p) => this.toSummary(p, performanceByPostId.get(p.id)?.engagementRate ?? 0));

    const segments: Record<string, InstagramSegmentSummary[]> = {
      mediaType: result.segments.byMediaType,
      postedHour: result.segments.byPostedHour,
      postedDow: result.segments.byPostedDow,
      captionLength: result.segments.byCaptionLength,
      hashtagCount: result.segments.byHashtagCount,
    };

    const { payload, model } = await this.ai.analyzeInstagramAccount({ topPosts, bottomPosts, segments });

    return this.prisma.instagramAnalysis.create({
      data: { accountId: account.id, scope: 'account', model, payload: payload as object },
    });
  }

  async analyzePost(organizationId: string, postId: string) {
    const post = await this.prisma.instagramPost.findFirst({
      where: { id: postId, account: { organizationId } },
    });
    if (!post) {
      throw new NotFoundException('Post no encontrado.');
    }

    const allPosts = await this.prisma.instagramPost.findMany({ where: { accountId: post.accountId } });
    const latestSnapshot = await this.prisma.instagramAccountSnapshot.findFirst({
      where: { accountId: post.accountId },
      orderBy: { capturedAt: 'desc' },
    });

    const result = this.performance.analyze(this.withInsights(allPosts), latestSnapshot?.followersCount ?? 0);
    const performanceByPostId = new Map(result.posts.map((p) => [p.postId, p]));

    const ranked = [...allPosts].filter((p) => performanceByPostId.has(p.id)).sort(
      (a, b) => (performanceByPostId.get(b.id)?.performanceIndex ?? 0) - (performanceByPostId.get(a.id)?.performanceIndex ?? 0),
    );
    const topPosts = ranked.slice(0, TOP_BOTTOM_COUNT).map((p) => this.toSummary(p, performanceByPostId.get(p.id)?.engagementRate ?? 0));
    const bottomPosts = ranked
      .slice(-TOP_BOTTOM_COUNT)
      .reverse()
      .map((p) => this.toSummary(p, performanceByPostId.get(p.id)?.engagementRate ?? 0));

    const postSummary = this.toSummary(post, performanceByPostId.get(post.id)?.engagementRate ?? 0);
    const classification = performanceByPostId.get(post.id)?.classification ?? 'normal';
    const { payload, model } = await this.ai.analyzeInstagramPost({
      post: postSummary,
      classification,
      topPosts,
      bottomPosts,
    });

    return this.prisma.instagramAnalysis.create({
      data: {
        accountId: post.accountId,
        postId: post.id,
        scope: 'post',
        model,
        payload: payload as object,
      },
    });
  }

  async listPosts(accountId: string, opts: { mediaType?: string; sort?: 'performance' | 'recent' }) {
    const posts = await this.prisma.instagramPost.findMany({
      where: { accountId, ...(opts.mediaType ? { mediaType: opts.mediaType } : {}) },
      orderBy: { postedAt: 'desc' },
    });
    const latestSnapshot = await this.prisma.instagramAccountSnapshot.findFirst({
      where: { accountId },
      orderBy: { capturedAt: 'desc' },
    });
    const result = this.performance.analyze(this.withInsights(posts), latestSnapshot?.followersCount ?? 0);
    const performanceByPostId = new Map(result.posts.map((p) => [p.postId, p]));

    const enriched = posts.map((post) => ({ ...post, performance: performanceByPostId.get(post.id) ?? null }));
    if (opts.sort === 'performance') {
      enriched.sort((a, b) => (b.performance?.performanceIndex ?? 0) - (a.performance?.performanceIndex ?? 0));
    }
    return enriched;
  }

  async getPost(accountId: string, postId: string) {
    const posts = await this.prisma.instagramPost.findMany({ where: { accountId } });
    const post = posts.find((p) => p.id === postId);
    if (!post) {
      throw new NotFoundException('Post no encontrado.');
    }
    const latestSnapshot = await this.prisma.instagramAccountSnapshot.findFirst({
      where: { accountId },
      orderBy: { capturedAt: 'desc' },
    });
    const result = this.performance.analyze(this.withInsights(posts), latestSnapshot?.followersCount ?? 0);
    const performance = result.posts.find((p) => p.postId === postId) ?? null;
    return { ...post, performance };
  }

  /** Only posts that have actually had insights synced should feed the performance baseline/classification —
   * otherwise the huge majority of never-synced historical posts (engagementRate=0) drag the median to zero
   * and every post ends up misclassified as "normal". */
  private withInsights<T extends { insightsSyncedAt: Date | null }>(posts: T[]): T[] {
    return posts.filter((p) => p.insightsSyncedAt !== null);
  }

  async trends(accountId: string, days: number) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.prisma.instagramAccountSnapshot.findMany({
      where: { accountId, capturedAt: { gte: cutoff } },
      orderBy: { capturedAt: 'asc' },
    });
  }

  async latestAccountAnalysis(accountId: string) {
    return this.prisma.instagramAnalysis.findFirst({
      where: { accountId, scope: 'account' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async latestPostAnalysis(organizationId: string, postId: string) {
    return this.prisma.instagramAnalysis.findFirst({
      where: { postId, scope: 'post', account: { organizationId } },
      orderBy: { createdAt: 'desc' },
    });
  }

  private toSummary(
    post: {
      id: string;
      caption: string | null;
      mediaType: string;
      postedAt: Date;
      views: number;
      reach: number;
      totalInteractions: number;
    },
    engagementRate: number,
  ): InstagramPostSummary {
    return {
      id: post.id,
      caption: (post.caption ?? '').slice(0, CAPTION_TRUNCATE_LENGTH),
      mediaType: post.mediaType,
      postedAt: post.postedAt.toISOString(),
      engagementRate,
      views: post.views,
      reach: post.reach,
      totalInteractions: post.totalInteractions,
    };
  }
}
