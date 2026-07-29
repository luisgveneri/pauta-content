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
} as const;

