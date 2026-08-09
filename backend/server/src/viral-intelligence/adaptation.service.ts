import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrganizationType, Prisma, TrendSource } from '@prisma/client';
import { AiService, AdaptationOrganizationContext } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { Adaptation, validateAdaptation } from './adaptation';
import { validateCreativePattern } from './creative-pattern';
import { PlanAdaptationDto } from './dto/plan-adaptation.dto';
import { TrendPatternService } from './trend-pattern.service';

const DEFAULT_PLATFORM_BY_SOURCE: Record<TrendSource, string> = {
  TIKTOK: 'TikTok',
  INSTAGRAM: 'Instagram',
  YOUTUBE: 'YouTube',
  MANUAL: 'Instagram',
};

const RECENT_PLANNER_WINDOW_DAYS = 30;
const TOP_CAPTIONS_LIMIT = 5;
const RECENT_TITLES_LIMIT = 10;

@Injectable()
export class AdaptationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly pattern: TrendPatternService,
  ) {}

  /**
   * Adapt -> Generate idea -> Generate script all happen in one call: the
   * model is asked for the full idea (hook through script through caption)
   * up front, rather than three separate round-trips the UI would have to
   * orchestrate. Ensures a CreativePattern exists first (cached if already
   * analyzed) — adaptation always needs one, so this removes a manual
   * "Analyze" step without ever re-running AI on an already-analyzed trend.
   */
  async adapt(
    organizationId: string,
    organizationType: OrganizationType,
    trendId: string,
  ) {
    const trend = await this.prisma.trend.findUnique({
      where: { id: trendId },
    });
    if (!trend) {
      throw new NotFoundException('Trend not found.');
    }

    const patternRecord = await this.pattern.analyze(trendId);
    const pattern = validateCreativePattern(patternRecord.payload);
    const { aiContext, activeCampaignId } = await this.buildContext(
      organizationId,
      organizationType,
    );

    const { payload, model } = await this.ai.adaptTrendForOrganization(
      { title: trend.title, durationSec: trend.durationSec },
      {
        hookType: pattern.hookType,
        hookText: pattern.hookText,
        format: pattern.format,
        topic: pattern.topic,
        emotion: pattern.emotion,
        mechanism: pattern.mechanism,
        structure: pattern.structure,
        ctaType: pattern.ctaType,
        pacing: pattern.pacing,
      },
      aiContext,
    );

    const adaptation = validateAdaptation(
      payload,
      DEFAULT_PLATFORM_BY_SOURCE[trend.source],
      trend.durationSec,
    );

    return this.prisma.trendAdaptation.create({
      data: {
        organizationId,
        trendId,
        campaignId: activeCampaignId,
        model,
        payload: adaptation as unknown as Prisma.InputJsonValue,
        status: 'DRAFT',
      },
    });
  }

  /**
   * Turns an adaptation into a real PlannerItem — same idempotent,
   * transactional shape as CampaignsService.confirmSlot(): a conditional
   * `updateMany` (plannerItemId: null) acts as an optimistic lock so two
   * near-simultaneous "Add to Planner" clicks can't both win.
   */
  async planAdaptation(
    organizationId: string,
    adaptationId: string,
    dto: PlanAdaptationDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const adaptation = await tx.trendAdaptation.findFirst({
        where: { id: adaptationId, organizationId },
      });
      if (!adaptation) {
        throw new NotFoundException('Adaptation not found.');
      }
      if (adaptation.plannerItemId) {
        throw new ConflictException(
          'This adaptation is already on the Planner.',
        );
      }

      const payload = adaptation.payload as unknown as Adaptation;
      const plannerItem = await tx.plannerItem.create({
        data: {
          organizationId,
          date: dto.date ? new Date(dto.date) : new Date(),
          title: dto.title ?? payload.title,
          platform: dto.platform ?? payload.platform,
          status: dto.status ?? 'Draft',
        },
      });

      const result = await tx.trendAdaptation.updateMany({
        where: { id: adaptationId, plannerItemId: null },
        data: { plannerItemId: plannerItem.id, status: 'PLANNED' },
      });

      if (result.count === 0) {
        // Lost the race: another request planned this adaptation in the meantime.
        await tx.plannerItem.delete({ where: { id: plannerItem.id } });
        throw new ConflictException(
          'This adaptation is already on the Planner.',
        );
      }

      return tx.trendAdaptation.findUniqueOrThrow({
        where: { id: adaptationId },
        include: { plannerItem: true, trend: true },
      });
    });
  }

  private async buildContext(
    organizationId: string,
    organizationType: OrganizationType,
  ): Promise<{
    aiContext: AdaptationOrganizationContext;
    activeCampaignId: string | null;
  }> {
    const since = new Date(
      Date.now() - RECENT_PLANNER_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );

    const [recentPlannerItems, activeCampaign, account] = await Promise.all([
      this.prisma.plannerItem.findMany({
        where: { organizationId, date: { gte: since } },
        select: { title: true },
        take: RECENT_TITLES_LIMIT,
      }),
      organizationType === 'CLUB'
        ? this.prisma.campaign.findFirst({
            where: { organizationId, eventEndDate: { gte: new Date() } },
            orderBy: { eventStartDate: 'asc' },
          })
        : Promise.resolve(null),
      this.prisma.instagramAccount.findFirst({ where: { organizationId } }),
    ]);

    // A simple recency/interactions-ordered top-5, not the full
    // baseline-relative ranking RecommendationService computes — this only
    // flavors the prompt, it isn't a scored decision, so the lighter query is fine.
    let topPerformingCaptions: string[] = [];
    if (account) {
      const posts = await this.prisma.instagramPost.findMany({
        where: { accountId: account.id, insightsSyncedAt: { not: null } },
        orderBy: { totalInteractions: 'desc' },
        take: TOP_CAPTIONS_LIMIT,
        select: { caption: true },
      });
      topPerformingCaptions = posts
        .map((p) => p.caption ?? '')
        .filter((c) => c.length > 0);
    }

    return {
      aiContext: {
        organizationType,
        topPerformingCaptions,
        recentPlannerTitles: recentPlannerItems.map((i) => i.title),
        activeCampaign: activeCampaign
          ? { name: activeCampaign.name, objective: activeCampaign.objective }
          : null,
      },
      activeCampaignId: activeCampaign?.id ?? null,
    };
  }
}
