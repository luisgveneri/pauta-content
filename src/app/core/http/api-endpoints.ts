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
} as const;

