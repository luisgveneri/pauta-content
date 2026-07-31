import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const LOOKBACK_DAYS = 60;
const CONTENT_IMPACT_WINDOW_DAYS = 2;

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class PlaytomicInsightsService {
  constructor(private readonly prisma: PrismaService) {}

  async getInsights(organizationId: string) {
    const since = new Date();
    since.setDate(since.getDate() - LOOKBACK_DAYS);

    const bookings = await this.prisma.booking.findMany({
      where: { organizationId, startAt: { gte: since } },
      orderBy: { startAt: 'asc' },
    });

    if (bookings.length === 0) {
      return { hasMockData: false, overall: null, bookingsByDay: [], contentImpact: [] };
    }

    const confirmed = bookings.filter((b) => b.status === 'CONFIRMED');
    const overall = {
      bookingsCount: confirmed.length,
      revenueCents: confirmed.reduce((sum, b) => sum + b.priceCents, 0),
      avgPricePerBookingCents: confirmed.length > 0 ? Math.round(mean(confirmed.map((b) => b.priceCents))) : 0,
    };

    const byDay = new Map<string, { count: number; revenueCents: number }>();
    for (const booking of confirmed) {
      const key = dayKey(booking.startAt);
      const entry = byDay.get(key) ?? { count: 0, revenueCents: 0 };
      entry.count += 1;
      entry.revenueCents += booking.priceCents;
      byDay.set(key, entry);
    }
    const bookingsByDay = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, stats]) => ({ date, ...stats }));

    const plannerItems = await this.prisma.plannerItem.findMany({
      where: { organizationId, date: { gte: since } },
      orderBy: { date: 'asc' },
    });

    const contentImpact = plannerItems.map((item) => {
      const windowEnd = new Date(item.date);
      windowEnd.setDate(windowEnd.getDate() + CONTENT_IMPACT_WINDOW_DAYS);
      const inWindow = confirmed.filter((b) => b.startAt >= item.date && b.startAt <= windowEnd);
      return {
        plannerItemId: item.id,
        title: item.title,
        date: item.date,
        bookingsInWindow: inWindow.length,
        revenueCentsInWindow: inWindow.reduce((sum, b) => sum + b.priceCents, 0),
      };
    });

    return { hasMockData: true, overall, bookingsByDay, contentImpact };
  }
}
