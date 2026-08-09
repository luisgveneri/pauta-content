import { randomUUID } from 'node:crypto';
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

// Exported so PlaytomicGapsService aggregates against the exact same grid
// this generator books into — "occupancy of this slot" has to mean the same
// thing in both places.
export const LOOKBACK_DAYS = 60;
export const SLOT_MINUTES = 90;
// Fixed daily grid: 10 non-overlapping 90-minute slots, 08:00 to 23:00.
export const SLOT_START_MINUTES = [480, 570, 660, 750, 840, 930, 1020, 1110, 1200, 1290];

const COURT_NAMES = ['Pista 1', 'Pista 2', 'Pista 3', 'Pista 4', 'Pista 5'];
const CANCELLATION_RATE = 0.06;
const CONTENT_BOOST_WINDOW_DAYS = 2;
const CONTENT_BOOST_MULTIPLIER = 1.15;

// Small fixed name pools (no new dependency, same call we made for the line
// chart) — combined they give thousands of distinct combinations, plenty for
// a single club's member base.
const FIRST_NAMES = [
  'Alejandro', 'Álvaro', 'Ana', 'Beatriz', 'Carlos', 'Carmen', 'Cristina', 'Daniel', 'David', 'Elena',
  'Fernando', 'Gonzalo', 'Irene', 'Javier', 'Jorge', 'José', 'Laura', 'Lucía', 'Manuel', 'Marcos',
  'María', 'Miguel', 'Natalia', 'Pablo', 'Paula', 'Raquel', 'Rodrigo', 'Sara', 'Sergio', 'Victoria',
];
const LAST_NAMES = [
  'García', 'Fernández', 'González', 'Rodríguez', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez',
  'Martín', 'Jiménez', 'Ruiz', 'Hernández', 'Díaz', 'Moreno', 'Álvarez', 'Romero', 'Alonso', 'Gutiérrez',
  'Navarro',
];

// A club's member base skews heavily toward a small core of regulars and a
// long tail of occasional/one-off players, not a flat distribution — this
// weighting is what makes "nuevo/recurrente/dormido" segmentation meaningful
// instead of arbitrary.
type ActivityTier = 'REGULAR' | 'OCCASIONAL' | 'RARE';
// Weights tuned so a RARE player lands ~1-2 appearances in 60 days, OCCASIONAL
// ~3-6 (roughly every 2-4 weeks), REGULAR ~12-18 (roughly 2x/week) — matches
// the plan's narrative, not just a plausible-looking ratio.
const ACTIVITY_TIERS: { tier: ActivityTier; share: number; weight: number }[] = [
  { tier: 'REGULAR', share: 0.2, weight: 8 },
  { tier: 'OCCASIONAL', share: 0.5, weight: 2 },
  { tier: 'RARE', share: 0.3, weight: 1 },
];

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

type PoolPlayer = { id: string; name: string; email: string; weight: number };

function buildPlayerPool(size: number): PoolPlayer[] {
  const usedNames = new Set<string>();
  const pool: PoolPlayer[] = [];

  while (pool.length < size) {
    const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const name = `${first} ${last}`;
    // Allow repeated real-world-plausible name collisions once the pool
    // outgrows the combination space, just not obvious back-to-back dupes.
    if (usedNames.has(name) && pool.length < FIRST_NAMES.length * LAST_NAMES.length) continue;
    usedNames.add(name);

    const roll = Math.random();
    let cumulative = 0;
    let weight = 1;
    for (const t of ACTIVITY_TIERS) {
      cumulative += t.share;
      if (roll <= cumulative) {
        weight = t.weight;
        break;
      }
    }

    pool.push({
      id: randomUUID(),
      name,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${pool.length}@example.com`,
      weight,
    });
  }
  return pool;
}

/** Weighted sample of `count` distinct players from the pool. */
function pickParticipants(pool: PoolPlayer[], count: number): PoolPlayer[] {
  const available = [...pool];
  const picked: PoolPlayer[] = [];
  for (let i = 0; i < count && available.length > 0; i++) {
    const totalWeight = available.reduce((sum, p) => sum + p.weight, 0);
    let roll = Math.random() * totalWeight;
    let index = 0;
    for (; index < available.length; index++) {
      roll -= available[index].weight;
      if (roll <= 0) break;
    }
    picked.push(available.splice(Math.min(index, available.length - 1), 1)[0]);
  }
  return picked;
}

@Injectable()
export class PlaytomicMockService {
  constructor(private readonly prisma: PrismaService) {}

  async seed(organizationId: string) {
    // Idempotent: clear any previous mock rows first so re-clicking "Generar"
    // regenerates cleanly instead of doubling up.
    await this.clear(organizationId);

    const contentDates = await this.getContentDates(organizationId);
    const now = new Date();

    // Pass 1: decide which slots get booked, at what price/status — same
    // logic as before, just without picking participants yet.
    const bookingSpecs: {
      id: string;
      courtName: string;
      startAt: Date;
      endAt: Date;
      priceCents: number;
      status: string;
      participantsCount: number;
    }[] = [];

    for (let daysAgo = LOOKBACK_DAYS; daysAgo >= 0; daysAgo--) {
      const day = new Date(now);
      day.setDate(day.getDate() - daysAgo);
      day.setHours(0, 0, 0, 0);
      const weekend = isWeekend(day);
      const growthFactor = 0.85 + 0.15 * (1 - daysAgo / LOOKBACK_DAYS);
      const boosted = this.hasNearbyContent(day, contentDates);

      for (const courtName of COURT_NAMES) {
        for (const startMinutes of SLOT_START_MINUTES) {
          const hour = startMinutes / 60;
          let probability = baseOccupancy(weekend, hour) * growthFactor;
          if (boosted) probability = Math.min(0.98, probability * CONTENT_BOOST_MULTIPLIER);
          if (Math.random() > probability) continue;

          const startAt = new Date(day);
          startAt.setMinutes(startMinutes);
          const endAt = new Date(startAt.getTime() + SLOT_MINUTES * 60 * 1000);

          bookingSpecs.push({
            id: randomUUID(),
            courtName,
            startAt,
            endAt,
            priceCents: priceCentsFor(weekend, hour),
            status: Math.random() < CANCELLATION_RATE ? 'CANCELED' : 'CONFIRMED',
            participantsCount: Math.random() < 0.9 ? 4 : 2, // padel is almost always doubles
          });
        }
      }
    }

    // Pool size scales with expected participant-slots, not a fixed
    // constant — roughly one player per 5 slot-fills over the window. Sized
    // together with ACTIVITY_TIERS' weights so the *distribution* comes out
    // realistic (a long tail of 1-2-timers, not almost everyone "recurring").
    const totalParticipantSlots = bookingSpecs.reduce((sum, b) => sum + b.participantsCount, 0);
    const poolSize = Math.max(100, Math.round(totalParticipantSlots / 5));
    const pool = buildPlayerPool(poolSize);

    const participantRows: { id: string; bookingId: string; playerId: string }[] = [];
    for (const booking of bookingSpecs) {
      for (const player of pickParticipants(pool, booking.participantsCount)) {
        participantRows.push({ id: randomUUID(), bookingId: booking.id, playerId: player.id });
      }
    }

    await this.prisma.player.createMany({
      data: pool.map((p) => ({ id: p.id, organizationId, name: p.name, email: p.email })),
    });
    await this.prisma.booking.createMany({
      data: bookingSpecs.map((b) => ({ ...b, organizationId })),
    });
    await this.prisma.bookingParticipant.createMany({ data: participantRows });

    return { created: bookingSpecs.length, players: pool.length };
  }

  async clear(organizationId: string) {
    const result = await this.prisma.booking.deleteMany({ where: { organizationId, source: 'mock' } });
    // Players only ever exist for mock bookings today, so it's safe to drop
    // any left with no participations after that cascade.
    await this.prisma.player.deleteMany({ where: { organizationId, participations: { none: {} } } });
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
