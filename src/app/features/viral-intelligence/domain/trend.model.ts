export type TrendSource = 'TIKTOK' | 'INSTAGRAM' | 'YOUTUBE' | 'MANUAL';
export type TrendStatus = 'NEW' | 'RISING' | 'HOT' | 'STABLE' | 'DECLINING' | 'EXPIRED';

export type ScoreComponent = {
  key: string;
  label: string;
  raw: number;
  normalized: number;
  weight: number;
  contribution: number;
};

export type ScoreBreakdown = {
  components: ScoreComponent[];
  total: number;
};

export type TrendPattern = {
  id: string;
  trendId: string;
  model: string;
  payload: unknown;
  format: string;
  topic: string;
  emotion: string;
  ctaType: string;
  createdAt: string;
};

export type Trend = {
  id: string;
  source: TrendSource;
  isDemo: boolean;
  externalId: string;
  url: string;

  authorHandle: string;
  authorFollowers: number;
  authorMedianViews: number | null;

  title: string;
  caption: string | null;
  hashtags: string[];
  durationSec: number;
  thumbnailUrl: string | null;
  publishedAt: string;

  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;

  viralScore: number;
  scoreBreakdown: ScoreBreakdown | null;
  relativePerformance: number | null;
  status: TrendStatus;
  scoredAt: string | null;

  createdAt: string;
  updatedAt: string;

  pattern: TrendPattern | null;
};

export type TrendSortOption = 'score' | 'recent' | 'relativePerformance';

export type TrendFilters = {
  source?: TrendSource;
  format?: string;
  topic?: string;
  minScore?: number;
  maxDuration?: number;
  sort?: TrendSortOption;
};

export const TREND_SOURCE_LABELS: Record<TrendSource, string> = {
  TIKTOK: 'TikTok',
  INSTAGRAM: 'Instagram',
  YOUTUBE: 'YouTube',
  MANUAL: 'Manual',
};

export const TREND_STATUS_LABELS: Record<TrendStatus, string> = {
  NEW: 'New',
  RISING: 'Rising',
  HOT: 'Hot',
  STABLE: 'Stable',
  DECLINING: 'Declining',
  EXPIRED: 'Expired',
};

export type PersonalizationLevel = 'full' | 'partial' | 'generic';

export type RecommendedTrend = {
  trend: Trend;
  matchScore: number;
  reasons: string[];
};

export type RecommendationsResponse = {
  personalizationLevel: PersonalizationLevel;
  recommendations: RecommendedTrend[];
};

export type Adaptation = {
  title: string;
  hook: string;
  concept: string;
  structure: string[];
  scenes: string[];
  script: string;
  cta: string;
  caption: string;
  platform: string;
  durationSec: number;
  rationale: string;
};

export type AdaptationStatus = 'DRAFT' | 'PLANNED';

export type TrendAdaptation = {
  id: string;
  organizationId: string;
  trendId: string;
  campaignId: string | null;
  model: string;
  payload: Adaptation;
  status: AdaptationStatus;
  plannerItemId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PlanAdaptationDto = {
  date?: string;
  title?: string;
  platform?: string;
  status?: string;
};
