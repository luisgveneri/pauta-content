import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const LOOKBACK_DAYS = 60;
const CONTENT_IMPACT_WINDOW_DAYS = 2;
// Segmentation windows — computed purely within the 60-day dataset we
// actually have, not against history that doesn't exist. See the Player
// plan for why these specific cutoffs.
const NEW_WINDOW_DAYS = 14;
const DORMANT_INACTIVE_DAYS = 30;

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
      return { hasMockData: false, overall: null, bookingsByDay: [], contentImpact: [], players: null };
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

    const players = await this.getPlayerStats(organizationId, since);

    return { hasMockData: true, overall, bookingsByDay, contentImpact, players };
  }

  private async getPlayerStats(organizationId: string, since: Date) {
    const participations = await this.prisma.bookingParticipant.findMany({
      where: { booking: { organizationId, startAt: { gte: since }, status: 'CONFIRMED' } },
      select: { playerId: true, booking: { select: { startAt: true } } },
    });

    const byPlayer = new Map<string, Date[]>();
    for (const p of participations) {
      const dates = byPlayer.get(p.playerId) ?? [];
      dates.push(p.booking.startAt);
      byPlayer.set(p.playerId, dates);
    }

    const now = new Date();
    const newCutoff = new Date(now);
    newCutoff.setDate(newCutoff.getDate() - NEW_WINDOW_DAYS);
    const dormantCutoff = new Date(now);
    dormantCutoff.setDate(dormantCutoff.getDate() - DORMANT_INACTIVE_DAYS);

    let newCount = 0;
    let recurringCount = 0;
    let dormantCount = 0;

    for (const dates of byPlayer.values()) {
      const first = new Date(Math.min(...dates.map((d) => d.getTime())));
      const last = new Date(Math.max(...dates.map((d) => d.getTime())));
      const isNew = first >= newCutoff;
      const isRecurring = dates.length >= 2 && last >= newCutoff;
      const hadEarlyActivity = first < dormantCutoff;
      const isDormant = hadEarlyActivity && last < dormantCutoff;

      if (isNew) newCount += 1;
      if (isRecurring) recurringCount += 1;
      if (isDormant) dormantCount += 1;
    }

    return {
      totalActive: byPlayer.size,
      newCount,
      recurringCount,
      dormantCount,
    };
  }
}
