export type PlaytomicOverall = {
  bookingsCount: number;
  revenueCents: number;
  avgPricePerBookingCents: number;
};

export type BookingsByDay = {
  date: string;
  count: number;
  revenueCents: number;
};

export type ContentImpact = {
  plannerItemId: string;
  title: string;
  date: string;
  bookingsInWindow: number;
  revenueCentsInWindow: number;
};

export type PlayerStats = {
  totalActive: number;
  newCount: number;
  recurringCount: number;
  dormantCount: number;
};

export type PlaytomicInsights = {
  hasMockData: boolean;
  overall: PlaytomicOverall | null;
  bookingsByDay: BookingsByDay[];
  contentImpact: ContentImpact[];
  players: PlayerStats | null;
};

export type OccupancyGap = {
  dayOfWeek: number;
  dayLabel: string;
  slotStartMinutes: number;
  slotLabel: string;
  occupancyPercent: number;
  suggestion: string;
};

export type BriefingYesterday = {
  date: string;
  bookingsCount: number;
  revenueCents: number;
  baseline: { meanBookings: number; observations: number } | null;
  deltaPercent: number | null;
};

export type BriefingToday = {
  bookingsCount: number;
  occupancyPercent: number;
  freeSlotsRemaining: number;
};

export type BriefingContentItem = {
  id: string;
  title: string;
  platform: string;
  status: string;
};

export type BriefingTopGap = OccupancyGap & { nextDate: string };

export type MorningBriefing = {
  hasData: boolean;
  yesterday: BriefingYesterday | null;
  today: BriefingToday | null;
  newPlayers7d: number;
  contentToday: BriefingContentItem[];
  topGap: BriefingTopGap | null;
};
