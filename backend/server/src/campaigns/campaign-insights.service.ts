import { Injectable } from '@nestjs/common';
import { CampaignObjective } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CAMPAIGN_TEMPLATES, OBJECTIVE_RESULT_UNITS } from './campaign-templates';

const MIN_CAMPAIGNS_PER_OBJECTIVE = 3;
const MIN_CAMPAIGNS_PER_BUCKET = 2;

// OTHER is deliberately excluded: two OTHER campaigns can measure completely
// different things (attendees vs. shirts sold), so averaging them together
// would be exactly the false-conclusion trap this endpoint exists to avoid.
const COMPARABLE_OBJECTIVES: CampaignObjective[] = ['TOURNAMENT', 'CLINIC', 'TEAM_RECRUITMENT'];

const OBJECTIVE_LABELS: Record<CampaignObjective, string> = {
  TOURNAMENT: 'Torneo',
  CLINIC: 'Clinic',
  TEAM_RECRUITMENT: 'Captación de equipo',
  OTHER: 'Otro',
};

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

@Injectable()
export class CampaignInsightsService {
  constructor(private readonly prisma: PrismaService) {}

  async getInsights(organizationId: string) {
    const objectives = await Promise.all(
      COMPARABLE_OBJECTIVES.map((objective) => this.buildObjectiveInsights(organizationId, objective)),
    );

    return {
      disclaimer:
        'Estos números muestran correlación, no causalidad, y se basan en muestras pequeñas — trátalos como una pista, no como una conclusión.',
      minCampaignsPerObjective: MIN_CAMPAIGNS_PER_OBJECTIVE,
      minCampaignsPerBucket: MIN_CAMPAIGNS_PER_BUCKET,
      objectives,
    };
  }

  private async buildObjectiveInsights(organizationId: string, objective: CampaignObjective) {
    const campaigns = await this.prisma.campaign.findMany({
      where: {
        organizationId,
        objective,
        resultRecordedAt: { not: null },
        eventEndDate: { lt: new Date() },
      },
      include: { contentSlots: true },
    });

    const unitLabel = OBJECTIVE_RESULT_UNITS[objective];
    const campaignsWithResult = campaigns.length;
    const values = campaigns.map((c) => c.resultValue as number);

    const overall =
      campaignsWithResult > 0
        ? {
            mean: mean(values),
            median: median(values),
            min: Math.min(...values),
            max: Math.max(...values),
          }
        : null;

    if (campaignsWithResult < MIN_CAMPAIGNS_PER_OBJECTIVE) {
      return {
        objective,
        unitLabel,
        campaignsWithResult,
        status: 'insufficient_data' as const,
        message: `Necesitas al menos ${MIN_CAMPAIGNS_PER_OBJECTIVE} campañas de tipo ${OBJECTIVE_LABELS[objective]} finalizadas y con resultado registrado para ver este análisis. Tienes ${campaignsWithResult}.`,
        overall,
        slots: [],
      };
    }

    const template = CAMPAIGN_TEMPLATES[objective];
    const slots = template.map(({ label, phase }) => {
      const withValues: number[] = [];
      const withoutValues: number[] = [];
      for (const campaign of campaigns) {
        const slot = campaign.contentSlots.find((s) => s.label === label);
        const confirmed = !!slot?.plannerItemId;
        (confirmed ? withValues : withoutValues).push(campaign.resultValue as number);
      }

      const comparable =
        withValues.length >= MIN_CAMPAIGNS_PER_BUCKET && withoutValues.length >= MIN_CAMPAIGNS_PER_BUCKET;

      return {
        label,
        phase,
        withCount: withValues.length,
        withMean: comparable ? mean(withValues) : null,
        withMedian: comparable ? median(withValues) : null,
        withoutCount: withoutValues.length,
        withoutMean: comparable ? mean(withoutValues) : null,
        withoutMedian: comparable ? median(withoutValues) : null,
        difference: comparable ? mean(withValues) - mean(withoutValues) : null,
        comparable,
        ...(comparable ? {} : { reason: 'too_few_in_bucket' as const }),
      };
    });

    return {
      objective,
      unitLabel,
      campaignsWithResult,
      status: 'ok' as const,
      message: null,
      overall,
      slots,
    };
  }
}
