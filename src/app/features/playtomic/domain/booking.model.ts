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

export type PlaytomicInsights = {
  hasMockData: boolean;
  overall: PlaytomicOverall | null;
  bookingsByDay: BookingsByDay[];
  contentImpact: ContentImpact[];
};
