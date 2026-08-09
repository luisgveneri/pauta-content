import { Platform } from '../../../shared/models/platform.model';

export type PlannerItemStatus = 'Draft' | 'Ready' | 'Scheduled' | 'Posted';

export type PlannerItem = {
  id: string;
  date: string; // ISO date
  title: string;
  platform: Platform;
  status: PlannerItemStatus;
  trendAdaptation?: { trend: { id: string; title: string } } | null;
};

export type CreatePlannerItemDto = {
  date: string;
  title: string;
  platform: Platform;
  status: PlannerItemStatus;
};
