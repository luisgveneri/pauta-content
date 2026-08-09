import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LOOKBACK_DAYS, SLOT_START_MINUTES } from './playtomic-mock.service';

const GAP_THRESHOLD = 0.35; // below this occupancy, the slot counts as a "gap"
const MIN_OCCURRENCES = 3; // don't flag a gap from fewer than 3 observed instances of that day/slot
const MAX_GAPS = 5;

const DAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function formatSlotLabel(startMinutes: number): string {
  const start = `${String(Math.floor(startMinutes / 60)).padStart(2, '0')}:${String(startMinutes % 60).padStart(2, '0')}`;
  const endMinutes = startMinutes + 90;
  const end = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
  return `${start} - ${end}`;
}

/** Deterministic, not AI-generated — an honest fixed mapping beats invented prose per slot. */
function suggestionFor(weekend: boolean, startMinutes: number): string {
  const hour = startMinutes / 60;
  if (!weekend && hour < 10) return 'Clases o entrenamientos matutinos — franja tranquila para captar jugadores nuevos.';
  if (!weekend && hour >= 12 && hour < 16) return 'Promoción de mediodía (ej. "happy hour" con descuento) para llenar la sobremesa.';
  if (weekend && hour >= 14 && hour < 18) return 'Torneo social o americano — la tarde de fin de semana suele responder bien a esto.';
  if (weekend) return 'Contenido dirigido a jugadores ocasionales — esta franja de fin de semana tiene hueco.';
  return 'Contenido o promoción puntual para esta franja entre semana.';
}

/** Snaps a real timestamp to the nearest slot in the fixed grid — mock data lands exactly, real Playtomic data later might not. */
function nearestSlot(startMinutes: number): number {
  return SLOT_START_MINUTES.reduce((closest, candidate) =>
    Math.abs(candidate - startMinutes) < Math.abs(closest - startMinutes) ? candidate : closest,
  );
}

@Injectable()
export class PlaytomicGapsService {
  constructor(private readonly prisma: PrismaService) {}

  async getGaps(organizationId: string) {
    const since = new Date();
    since.setDate(since.getDate() - LOOKBACK_DAYS);

    const bookings = await this.prisma.booking.findMany({
      where: { organizationId, startAt: { gte: since }, status: 'CONFIRMED' },
      select: { startAt: true, courtName: true },
    });

    if (bookings.length === 0) return [];

    const courtCount = new Set(bookings.map((b) => b.courtName)).size;

    // How many times each weekday occurred in the lookback window — the
    // denominator for "how many chances did this day/slot combo have".
    const weekdayOccurrences = new Array(7).fill(0);
    for (let d = 0; d < LOOKBACK_DAYS; d++) {
      const day = new Date(since);
      day.setDate(day.getDate() + d);
      weekdayOccurrences[day.getDay()] += 1;
    }

    const bucketCounts = new Map<string, number>(); // key: `${dayOfWeek}-${slotStart}`
    for (const booking of bookings) {
      const dayOfWeek = booking.startAt.getDay();
      const slot = nearestSlot(booking.startAt.getHours() * 60 + booking.startAt.getMinutes());
      const key = `${dayOfWeek}-${slot}`;
      bucketCounts.set(key, (bucketCounts.get(key) ?? 0) + 1);
    }

    const gaps: {
      dayOfWeek: number;
      dayLabel: string;
      slotStartMinutes: number;
      slotLabel: string;
      occupancyPercent: number;
      suggestion: string;
    }[] = [];

    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const occurrences = weekdayOccurrences[dayOfWeek];
      if (occurrences < MIN_OCCURRENCES) continue;
      const weekend = dayOfWeek === 0 || dayOfWeek === 6;

      for (const slotStartMinutes of SLOT_START_MINUTES) {
        const count = bucketCounts.get(`${dayOfWeek}-${slotStartMinutes}`) ?? 0;
        const occupancy = count / (occurrences * courtCount);
        if (occupancy >= GAP_THRESHOLD) continue;

        gaps.push({
          dayOfWeek,
          dayLabel: DAY_LABELS[dayOfWeek],
          slotStartMinutes,
          slotLabel: formatSlotLabel(slotStartMinutes),
          occupancyPercent: Math.round(occupancy * 100),
          suggestion: suggestionFor(weekend, slotStartMinutes),
        });
      }
    }

    return gaps.sort((a, b) => a.occupancyPercent - b.occupancyPercent).slice(0, MAX_GAPS);
  }
}
