export const apiEndpoints = {
  content: {
    videos: '/api/content/videos',
  },
  ideas: {
    list: '/api/ideas',
    generate: '/api/ideas/generate',
  },
  dashboard: {
    stats: '/api/dashboard/stats',
  },
  planner: {
    items: '/api/planner/items',
  },
  instagram: {
    status: '/api/instagram/status',
    connect: '/api/instagram/connect',
    oauthConnect: '/api/instagram/oauth/connect',
    sync: '/api/instagram/sync',
    posts: '/api/instagram/posts',
    post: (id: string) => `/api/instagram/posts/${id}`,
    postAnalysis: (id: string) => `/api/instagram/posts/${id}/analysis`,
    trends: '/api/instagram/trends',
    analysis: '/api/instagram/analysis',
  },
  organizations: {
    current: '/api/organizations/current',
  },
  campaigns: {
    list: '/api/campaigns',
    create: '/api/campaigns',
    detail: (id: string) => `/api/campaigns/${id}`,
    confirmSlot: (campaignId: string, slotId: string) => `/api/campaigns/${campaignId}/slots/${slotId}/confirm`,
    result: (id: string) => `/api/campaigns/${id}/result`,
    insights: '/api/campaigns/insights',
  },
  playtomic: {
    insights: '/api/playtomic/insights',
    seedMock: '/api/playtomic/mock/seed',
    gaps: '/api/playtomic/gaps',
    briefing: '/api/playtomic/briefing',
  },
  viralIntelligence: {
    trends: '/api/viral-intelligence/trends',
    trend: (id: string) => `/api/viral-intelligence/trends/${id}`,
    recommendations: '/api/viral-intelligence/recommendations',
    saved: '/api/viral-intelligence/saved',
    save: (id: string) => `/api/viral-intelligence/trends/${id}/save`,
    adapt: (id: string) => `/api/viral-intelligence/trends/${id}/adapt`,
    plan: (adaptationId: string) => `/api/viral-intelligence/adaptations/${adaptationId}/plan`,
    seedMock: '/api/viral-intelligence/mock/seed',
  },
} as const;

