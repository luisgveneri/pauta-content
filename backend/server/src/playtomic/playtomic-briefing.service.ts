import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlaytomicGapsService } from './playtomic-gaps.service';
import { LOOKBACK_DAYS, SLOT_START_MINUTES } from './playtomic-mock.service';

const MIN_BASELINE_OBSERVATIONS = 3;
const NEW_PLAYER_WINDOW_DAYS = 7;

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Next real calendar date (today or later) that falls on the given weekday,
 * formatted from local date parts — NOT via dayKey()/toISOString(), which
 * would shift a local midnight back a day in any UTC+ timezone.
 */
function nextDateForWeekday(dayOfWeek: number, from: Date): string {
  const result = startOfDay(from);
  const diff = (dayOfWeek - result.getDay() + 7) % 7;
  result.setDate(result.getDate() + diff);
  const y = result.getFullYear();
  const m = String(result.getMonth() + 1).padStart(2, '0');
  const d = String(result.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

@Injectable()
export class PlaytomicBriefingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gapsService: PlaytomicGapsService,
  ) {}

  async getBriefing(organizationId: string) {
    const since = new Date();
    since.setDate(since.getDate() - LOOKBACK_DAYS);

    const bookings = await this.prisma.booking.findMany({
      where: { organizationId, startAt: { gte: since }, status: 'CONFIRMED' },
      select: { startAt: true, priceCents: true, courtName: true },
    });

    if (bookings.length === 0) {
      return {
        hasData: false,
        yesterday: null,
        today: null,
        newPlayers7d: 0,
        contentToday: [],
        topGap: null,
      };
    }

    const now = new Date();
    const today = startOfDay(now);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayWeekday = yesterday.getDay();

    const byDay = new Map<string, { count: number; revenueCents: number }>();
    for (const b of bookings) {
      const key = dayKey(b.startAt);
      const entry = byDay.get(key) ?? { count: 0, revenueCents: 0 };
      entry.count += 1;
      entry.revenueCents += b.priceCents;
      byDay.set(key, entry);
    }

    const yesterdayStats = byDay.get(dayKey(yesterday)) ?? { count: 0, revenueCents: 0 };

    // Same-weekday baseline: every occurrence of this weekday in the window,
    // excluding yesterday itself, so a Tuesday only ever gets compared to
    // other Tuesdays.
    const sameWeekdayCounts: number[] = [];
    for (const [key, stats] of byDay.entries()) {
      const date = new Date(`${key}T00:00:00`);
      if (date.getDay() === yesterdayWeekday && date.getTime() !== yesterday.getTime()) {
        sameWeekdayCounts.push(stats.count);
      }
    }
    const baseline =
      sameWeekdayCounts.length >= MIN_BASELINE_OBSERVATIONS
        ? {
            meanBookings: sameWeekdayCounts.reduce((sum, v) => sum + v, 0) / sameWeekdayCounts.length,
            observations: sameWeekdayCounts.length,
          }
        : null;

    const deltaPercent =
      baseline && baseline.meanBookings > 0
        ? Math.round(((yesterdayStats.count - baseline.meanBookings) / baseline.meanBookings) * 100)
        : null;

    // Today's occupancy against the same fixed grid the mock generator and
    // gaps detector use — real courts count, not a guessed constant.
    const courtCount = new Set(bookings.map((b) => b.courtName)).size;
    const todayBookings = bookings.filter((b) => startOfDay(b.startAt).getTime() === today.getTime());
    const totalSlotsToday = SLOT_START_MINUTES.length * courtCount;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const remainingSlotStarts = SLOT_START_MINUTES.filter((m) => m > nowMinutes).length;
    // Of the remaining slot-starts, subtract the ones today's bookings already fill.
    const bookedRemaining = todayBookings.filter(
      (b) => b.startAt.getHours() * 60 + b.startAt.getMinutes() > nowMinutes,
    ).length;

    const players = await this.getNewPlayersCount(organizationId);

    const todayStart = today;
    const todayEnd = new Date(today);
    todayEnd.setDate(todayEnd.getDate() + 1);
    const contentToday = await this.prisma.plannerItem.findMany({
      where: { organizationId, date: { gte: todayStart, lt: todayEnd } },
      select: { id: true, title: true, platform: true, status: true },
      orderBy: { date: 'asc' },
    });

    const gaps = await this.gapsService.getGaps(organizationId);
    const top = gaps[0] ?? null;
    const topGap = top ? { ...top, nextDate: nextDateForWeekday(top.dayOfWeek, now) } : null;

    return {
      hasData: true,
      yesterday: {
        date: dayKey(yesterday),
        bookingsCount: yesterdayStats.count,
        revenueCents: yesterdayStats.revenueCents,
        baseline,
        deltaPercent,
      },
      today: {
        bookingsCount: todayBookings.length,
        occupancyPercent: totalSlotsToday > 0 ? Math.round((todayBookings.length / totalSlotsToday) * 100) : 0,
        freeSlotsRemaining: Math.max(0, remainingSlotStarts * courtCount - bookedRemaining),
      },
      newPlayers7d: players,
      contentToday,
      topGap,
    };
  }

  private async getNewPlayersCount(organizationId: string): Promise<number> {
    const since = new Date();
    since.setDate(since.getDate() - LOOKBACK_DAYS);
    const newSince = new Date();
    newSince.setDate(newSince.getDate() - NEW_PLAYER_WINDOW_DAYS);

    const participations = await this.prisma.bookingParticipant.findMany({
      where: { booking: { organizationId, startAt: { gte: since }, status: 'CONFIRMED' } },
      select: { playerId: true, booking: { select: { startAt: true } } },
    });

    const firstSeen = new Map<string, Date>();
    for (const p of participations) {
      const current = firstSeen.get(p.playerId);
      if (!current || p.booking.startAt < current) firstSeen.set(p.playerId, p.booking.startAt);
    }

    let count = 0;
    for (const first of firstSeen.values()) {
      if (first >= newSince) count += 1;
    }
    return count;
  }
}
