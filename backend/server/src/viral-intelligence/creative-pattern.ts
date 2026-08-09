export type CreativePattern = {
  hookType: string;
  hookText: string;
  format: string;
  topic: string;
  emotion: string;
  mechanism: string;
  structure: string[];
  ctaType: string;
  editingStyle: string;
  visualStyle: string;
  pacing: string;
};

// Closed vocabularies the UI can build filters and chips against. The LLM is
// asked to pick from these, but nothing forces it to comply — every value is
// normalized against its list in validateCreativePattern() below, with
// 'other' as the landing spot for anything unrecognized. Topic is
// deliberately open (padel's topic space is too broad to enumerate).
export const HOOK_TYPES = [
  'mistake_based',
  'curiosity_gap',
  'pov',
  'question',
  'bold_claim',
  'story',
  'other',
] as const;
export const FORMATS = [
  'educational_list',
  'tutorial',
  'pov',
  'comparison',
  'story',
  'challenge',
  'highlight_reel',
  'review',
  'behind_the_scenes',
  'comedy_skit',
  'other',
] as const;
export const EMOTIONS = [
  'curiosity',
  'fear_of_missing_out',
  'humor',
  'inspiration',
  'nostalgia',
  'surprise',
  'pride',
  'other',
] as const;
export const CTA_TYPES = [
  'save',
  'share',
  'follow',
  'comment',
  'link_in_bio',
  'book_now',
  'other',
] as const;
export const PACINGS = ['fast', 'medium', 'slow', 'other'] as const;
export const EDITING_STYLES = [
  'fast_cuts',
  'single_take',
  'voiceover',
  'text_overlay',
  'split_screen',
  'slow_motion',
  'other',
] as const;
export const VISUAL_STYLES = [
  'demonstration',
  'talking_head',
  'b_roll',
  'animation',
  'text_only',
  'other',
] as const;

const MAX_TEXT_LENGTH = 240;
const MAX_STRUCTURE_STEPS = 12;
const MAX_STRUCTURE_STEP_LENGTH = 80;

function slug(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

function normalizeEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T {
  const candidate = slug(value) as T;
  return allowed.includes(candidate) ? candidate : ('other' as T);
}

function normalizeText(value: unknown, maxLength = MAX_TEXT_LENGTH): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function normalizeTopic(value: unknown): string {
  // Open vocabulary, but still bounded — a stray sentence instead of a
  // short label would break Discover's topic chips/filters.
  const text = normalizeText(value, 40);
  return text ? slug(text) : 'other';
}

function normalizeStructure(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (step): step is string =>
        typeof step === 'string' && step.trim().length > 0,
    )
    .slice(0, MAX_STRUCTURE_STEPS)
    .map((step) => step.trim().slice(0, MAX_STRUCTURE_STEP_LENGTH));
}

/**
 * The only gate a raw LLM response passes through before it's ever
 * persisted or shown to a user — rejects nothing (a malformed field just
 * degrades to a safe default), but guarantees the shape and vocabulary
 * downstream code depends on. See the Viral Intelligence plan's AI section.
 */
export function validateCreativePattern(raw: unknown): CreativePattern {
  const input =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  return {
    hookType: normalizeEnum(input['hookType'], HOOK_TYPES),
    hookText: normalizeText(input['hookText']),
    format: normalizeEnum(input['format'], FORMATS),
    topic: normalizeTopic(input['topic']),
    emotion: normalizeEnum(input['emotion'], EMOTIONS),
    mechanism: normalizeText(input['mechanism']),
    structure: normalizeStructure(input['structure']),
    ctaType: normalizeEnum(input['ctaType'], CTA_TYPES),
    editingStyle: normalizeEnum(input['editingStyle'], EDITING_STYLES),
    visualStyle: normalizeEnum(input['visualStyle'], VISUAL_STYLES),
    pacing: normalizeEnum(input['pacing'], PACINGS),
  };
}
