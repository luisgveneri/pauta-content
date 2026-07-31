export type InstagramStatus =
  | { connected: false }
  | {
      connected: true;
      username: string;
      igUserId: string;
      needsReconnect: boolean;
      tokenExpiresAt: string | null;
      lastSyncedAt: string | null;
    };

export type PerformanceClassification = 'over' | 'normal' | 'under';

export type PostPerformance = {
  postId: string;
  engagementRate: number;
  performanceIndex: number;
  classification: PerformanceClassification;
};

export type InstagramPost = {
  id: string;
  accountId: string;
  igMediaId: string;
  caption: string | null;
  mediaType: string;
  mediaProductType: string | null;
  permalink: string;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  postedAt: string;
  likeCount: number;
  commentsCount: number;
  reach: number;
  views: number;
  saved: number;
  shares: number;
  totalInteractions: number;
  avgWatchTimeMs: number | null;
  captionLength: number;
  hashtagCount: number;
  postedHour: number;
  postedDow: number;
  insightsSyncedAt: string | null;
  performance: PostPerformance | null;
};

export type InstagramTrendPoint = {
  id: string;
  capturedAt: string;
  followersCount: number;
  followsCount: number;
  mediaCount: number;
  reachDay: number | null;
  profileViewsDay: number | null;
  accountsEngagedDay: number | null;
};

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type InstagramAccountAnalysisPayload = {
  summary: string;
  patterns: { pattern: string; evidence: string; confidence: ConfidenceLevel }[];
  recommendations: { action: string; rationale: string; expectedImpact: string }[];
  bestPostingWindows: string[];
};

export type InstagramPostAnalysisPayload = {
  verdict: string;
  hypotheses: { hypothesis: string; evidence: string; confidence: ConfidenceLevel }[];
  replicationSteps: string[];
};

export type InstagramAnalysis<T> = {
  id: string;
  scope: 'account' | 'post';
  model: string;
  payload: T;
  createdAt: string;
};

export type SyncResult = { postsUpserted: number; insightsSynced: number; syncedAt: string };
