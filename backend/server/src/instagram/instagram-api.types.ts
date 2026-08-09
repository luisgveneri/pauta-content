export type GraphMedia = {
  id: string;
  caption?: string;
  media_type: string; // IMAGE | VIDEO | CAROUSEL_ALBUM
  media_product_type?: string; // FEED | REELS | STORY
  permalink: string;
  media_url?: string;
  thumbnail_url?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
  // Only ever populated on VIDEO/REELS media returned via Business
  // Discovery — never present for other accounts' IMAGE/CAROUSEL posts.
  view_count?: number;
};

export type GraphBusinessDiscovery = {
  id: string;
  username: string;
  followers_count: number;
  media_count: number;
  media?: { data: GraphMedia[] };
};

export type GraphAccount = {
  id: string;
  username: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
};

export type InsightValue = {
  name: string;
  period: string;
  values: Array<{ value: number }>;
};

export type AccountInsightsResult = {
  reach: number;
  profileViews: number;
  accountsEngaged: number;
};

export type MediaInsightsResult = {
  views: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saved: number;
  totalInteractions: number;
  avgWatchTimeMs?: number;
};

export type GraphPage = {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string; username: string };
};
