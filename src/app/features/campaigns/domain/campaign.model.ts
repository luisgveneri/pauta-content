import { Platform } from '../../../shared/models/platform.model';
import { PlannerItem } from '../../planner/domain/planner-item.model';

export type CampaignObjective = 'TOURNAMENT' | 'CLINIC' | 'TEAM_RECRUITMENT' | 'OTHER';
export type CampaignSlotPhase = 'PRE' | 'DURING' | 'POST';

export type CampaignContentSlot = {
  id: string;
  campaignId: string;
  phase: CampaignSlotPhase;
  label: string;
  scheduledDate: string;
  plannerItemId: string | null;
  plannerItem: PlannerItem | null;
  createdAt: string;
};

export type Campaign = {
  id: string;
  organizationId: string;
  name: string;
  objective: CampaignObjective;
  eventStartDate: string;
  eventEndDate: string;
  resultValue: number | null;
  resultNotes: string | null;
  resultRecordedAt: string | null;
  unitLabel: string;
  createdAt: string;
  updatedAt: string;
  contentSlots: CampaignContentSlot[];
};

export type CreateCampaignDto = {
  name: string;
  objective: CampaignObjective;
  eventStartDate: string;
  eventEndDate?: string;
};

export type ConfirmSlotDto = {
  platform: Platform;
  title?: string;
  status?: string;
  date?: string;
};

export type SetCampaignResultDto = {
  resultValue: number;
  resultNotes?: string;
};

export const CAMPAIGN_OBJECTIVE_LABELS: Record<CampaignObjective, string> = {
  TOURNAMENT: 'Torneo',
  CLINIC: 'Clinic',
  TEAM_RECRUITMENT: 'Captación de equipo',
  OTHER: 'Otro',
};

export type ComparableObjective = 'TOURNAMENT' | 'CLINIC' | 'TEAM_RECRUITMENT';

export type ObjectiveStats = {
  mean: number;
  median: number;
  min: number;
  max: number;
};

export type SlotInsight = {
  label: string;
  phase: CampaignSlotPhase;
  withCount: number;
  withMean: number | null;
  withMedian: number | null;
  withoutCount: number;
  withoutMean: number | null;
  withoutMedian: number | null;
  difference: number | null;
  comparable: boolean;
  reason?: 'too_few_in_bucket';
};

export type ObjectiveInsights = {
  objective: ComparableObjective;
  unitLabel: string;
  campaignsWithResult: number;
  status: 'ok' | 'insufficient_data';
  message: string | null;
  overall: ObjectiveStats | null;
  slots: SlotInsight[];
};

export type CampaignInsights = {
  disclaimer: string;
  minCampaignsPerObjective: number;
  minCampaignsPerBucket: number;
  objectives: ObjectiveInsights[];
};
