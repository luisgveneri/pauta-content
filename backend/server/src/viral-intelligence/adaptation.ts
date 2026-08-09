export type Adaptation = {
  title: string;
  hook: string;
  concept: string;
  structure: string[];
  scenes: string[];
  script: string;
  cta: string;
  caption: string;
  platform: string;
  durationSec: number;
  rationale: string;
};

const KNOWN_PLATFORMS = ['TikTok', 'Instagram', 'YouTube', 'X'] as const;

const MAX_SHORT_TEXT = 160;
const MAX_LONG_TEXT = 2000;
const MAX_LIST_ITEMS = 15;
const MAX_LIST_ITEM_LENGTH = 300;
const MIN_DURATION_SEC = 5;
const MAX_DURATION_SEC = 900;
const DEFAULT_DURATION_SEC = 30;

function normalizeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function normalizeList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is string =>
        typeof item === 'string' && item.trim().length > 0,
    )
    .slice(0, MAX_LIST_ITEMS)
    .map((item) => item.trim().slice(0, MAX_LIST_ITEM_LENGTH));
}

function normalizePlatform(value: unknown, fallback: string): string {
  const candidate = typeof value === 'string' ? value.trim() : '';
  const match = KNOWN_PLATFORMS.find(
    (p) => p.toLowerCase() === candidate.toLowerCase(),
  );
  return match ?? fallback;
}

function normalizeDuration(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? Math.round(value) : Number.NaN;
  if (!Number.isFinite(n) || n < MIN_DURATION_SEC || n > MAX_DURATION_SEC)
    return fallback;
  return n;
}

/**
 * The gate a raw adaptation response passes through before it's ever
 * persisted or shown — same posture as validateCreativePattern(): nothing
 * throws, every field degrades to a safe, bounded default. `fallbackPlatform`
 * comes from the source trend so a missing/invalid platform still lands on
 * something sensible instead of an empty PlannerItem field.
 */
export function validateAdaptation(
  raw: unknown,
  fallbackPlatform: string,
  fallbackDurationSec: number | null,
): Adaptation {
  const input =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  return {
    title: normalizeText(input['title'], MAX_SHORT_TEXT) || 'Untitled idea',
    hook: normalizeText(input['hook'], MAX_SHORT_TEXT),
    concept: normalizeText(input['concept'], MAX_LONG_TEXT),
    structure: normalizeList(input['structure']),
    scenes: normalizeList(input['scenes']),
    script: normalizeText(input['script'], MAX_LONG_TEXT),
    cta: normalizeText(input['cta'], MAX_SHORT_TEXT),
    caption: normalizeText(input['caption'], MAX_LONG_TEXT),
    platform: normalizePlatform(input['platform'], fallbackPlatform),
    durationSec: normalizeDuration(
      input['durationSec'],
      fallbackDurationSec || DEFAULT_DURATION_SEC,
    ),
    rationale: normalizeText(input['rationale'], MAX_LONG_TEXT),
  };
}
