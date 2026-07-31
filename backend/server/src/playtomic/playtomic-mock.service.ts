import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Generates realistic-looking padel booking data for prototyping the
 * "content → bookings → revenue" dashboard before a real Playtomic
 * connection exists. Occupancy/pricing bands are grounded in published 2026
 * data for Spanish padel clubs (avg ~14.78€/hour, peak-vs-off-peak pricing
 * up to ~2x apart) and typical demand patterns (weekday evening 18-22h and
 * weekend late-morning/midday are peak; weekday daytime is quiet) — not
 * uniform randomness. See the Playtomic integration plan for sources.
 *
 * Every row this writes has source: "mock" (the schema default) — a real
 * sync would write source: "playtomic" instead, and PlaytomicInsightsService
 * doesn't care which it reads, so swapping the data source later is a
 * data-access change, not a redesign.
 */

const LOOKBACK_DAYS = 60;
const COURT_NAMES = ['Pista 1', 'Pista 2', 'Pista 3', 'Pista 4', 'Pista 5'];
const SLOT_MINUTES = 90;
// Fixed daily grid: 10 non-overlapping 90-minute slots, 08:00 to 23:00.
const SLOT_START_MINUTES = [480, 570, 660, 750, 840, 930, 1020, 1110, 1200, 1290];
const CANCELLATION_RATE = 0.06;
const CONTENT_BOOST_WINDOW_DAYS = 2;
const CONTENT_BOOST_MULTIPLIER = 1.15;

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/** Base occupancy probability for a slot, before any content boost. */
function baseOccupancy(weekend: boolean, hour: number): number {
  if (weekend) {
    if (hour >= 9 && hour < 14) return 0.9; // weekend late-morning/midday peak
    if (hour >= 14 && hour < 18) return 0.55;
    if (hour >= 18 && hour < 21.5) return 0.7;
    return 0.35;
  }
  if (hour >= 18 && hour < 22) return 0.9; // weekday evening peak
  if (hour >= 12 && hour < 14) return 0.45; // weekday midday mini-peak
  if (hour >= 8 && hour < 16) return 0.28; // weekday daytime, low demand
  return 0.4;
}

/** Total price for the court (not per player) in cents, banded by peak/off-peak. */
function priceCentsFor(weekend: boolean, hour: number): number {
  const peak = weekend ? hour >= 9 && hour < 14 : hour >= 18 && hour < 22;
  const [min, max] = peak ? [3200, 4400] : [1800, 2400];
  const cents = min + Math.random() * (max - min);
  return Math.round(cents / 50) * 50; // round to nearest 0.50€, matches real pricing
}

@Injectable()
export class PlaytomicMockService {
  constructor(private readonly prisma: PrismaService) {}

  async seed(organizationId: string) {
    // Idempotent: clear any previous mock rows first so re-clicking "Generar"
    // regenerates cleanly instead of doubling up.
    await this.prisma.booking.deleteMany({ where: { organizationId, source: 'mock' } });

    const contentDates = await this.getContentDates(organizationId);

    const now = new Date();
    const rows: {
      organizationId: string;
      courtName: string;
      startAt: Date;
      endAt: Date;
      priceCents: number;
      participantsCount: number;
      status: string;
    }[] = [];

    for (let daysAgo = LOOKBACK_DAYS; daysAgo >= 0; daysAgo--) {
      const day = new Date(now);
      day.setDate(day.getDate() - daysAgo);
      day.setHours(0, 0, 0, 0);
      const weekend = isWeekend(day);

      // Mild organic-growth ramp: earlier days slightly quieter than recent ones.
      const growthFactor = 0.85 + 0.15 * (1 - daysAgo / LOOKBACK_DAYS);
      const boosted = this.hasNearbyContent(day, contentDates);

      for (const courtName of COURT_NAMES) {
        for (const startMinutes of SLOT_START_MINUTES) {
          const hour = startMinutes / 60;
          let probability = baseOccupancy(weekend, hour) * growthFactor;
          if (boosted) probability = Math.min(0.98, probability * CONTENT_BOOST_MULTIPLIER);

          if (Math.random() > probability) continue; // slot stays unbooked

          const startAt = new Date(day);
          startAt.setMinutes(startMinutes);
          const endAt = new Date(startAt.getTime() + SLOT_MINUTES * 60 * 1000);

          rows.push({
            organizationId,
            courtName,
            startAt,
            endAt,
            priceCents: priceCentsFor(weekend, hour),
            participantsCount: Math.random() < 0.9 ? 4 : 2, // padel is almost always doubles
            status: Math.random() < CANCELLATION_RATE ? 'CANCELED' : 'CONFIRMED',
          });
        }
      }
    }

    await this.prisma.booking.createMany({ data: rows });
    return { created: rows.length };
  }

  async clear(organizationId: string) {
    const result = await this.prisma.booking.deleteMany({ where: { organizationId, source: 'mock' } });
    return { deleted: result.count };
  }

  /** Dates (start of day) of any planner item in the lookback window — used to bias bookings upward shortly after content goes out. */
  private async getContentDates(organizationId: string): Promise<Date[]> {
    const since = new Date();
    since.setDate(since.getDate() - LOOKBACK_DAYS);
    const items = await this.prisma.plannerItem.findMany({
      where: { organizationId, date: { gte: since } },
      select: { date: true },
    });
    return items.map((i) => {
      const d = new Date(i.date);
      d.setHours(0, 0, 0, 0);
      return d;
    });
  }

  private hasNearbyContent(day: Date, contentDates: Date[]): boolean {
    return contentDates.some((contentDate) => {
      const diffDays = (day.getTime() - contentDate.getTime()) / (24 * 60 * 60 * 1000);
      return diffDays >= 0 && diffDays <= CONTENT_BOOST_WINDOW_DAYS;
    });
  }
}
