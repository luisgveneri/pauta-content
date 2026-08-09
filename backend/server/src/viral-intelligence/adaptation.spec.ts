import { validateAdaptation } from './adaptation';

describe('validateAdaptation', () => {
  it('accepts a well-formed payload as-is', () => {
    const result = validateAdaptation(
      {
        title: '3 errors that make you lose your first tournament match',
        hook: '3 errores que te hacen perder tu primer partido de torneo',
        concept: 'Educational list adapted for padel club acquisition.',
        structure: ['hook', 'mistake', 'mistake', 'mistake', 'cta'],
        scenes: ['Court establishing shot', 'Close-up on footwork'],
        script: 'Full script here.',
        cta: 'Sign up for our beginner clinic',
        caption: 'Tag someone who needs this before Saturday.',
        platform: 'TikTok',
        durationSec: 32,
        rationale:
          'Mirrors the mistake-based hook that performed well on the source trend.',
      },
      'Instagram',
      30,
    );

    expect(result.title).toBe(
      '3 errors that make you lose your first tournament match',
    );
    expect(result.platform).toBe('TikTok');
    expect(result.durationSec).toBe(32);
    expect(result.structure).toHaveLength(5);
  });

  it('never throws on null, undefined, or non-object input', () => {
    expect(() => validateAdaptation(null, 'TikTok', 30)).not.toThrow();
    expect(() => validateAdaptation(undefined, 'TikTok', 30)).not.toThrow();
    expect(() => validateAdaptation('nope', 'TikTok', 30)).not.toThrow();
    expect(() => validateAdaptation(42, 'TikTok', 30)).not.toThrow();
  });

  it('falls back to the source trend platform when the model omits or invents one', () => {
    const missing = validateAdaptation({ title: 'x' }, 'YouTube', 30);
    const invented = validateAdaptation(
      { title: 'x', platform: 'Threads' },
      'YouTube',
      30,
    );

    expect(missing.platform).toBe('YouTube');
    expect(invented.platform).toBe('YouTube');
  });

  it('is case-insensitive when the platform is valid but differently cased', () => {
    const result = validateAdaptation({ platform: 'tiktok' }, 'YouTube', 30);
    expect(result.platform).toBe('TikTok');
  });

  it('falls back to a sane default duration when missing or out of range', () => {
    expect(validateAdaptation({}, 'TikTok', 45).durationSec).toBe(45);
    expect(
      validateAdaptation({ durationSec: 0 }, 'TikTok', 45).durationSec,
    ).toBe(45);
    expect(
      validateAdaptation({ durationSec: 100_000 }, 'TikTok', 45).durationSec,
    ).toBe(45);
    expect(
      validateAdaptation({ durationSec: 'a lot' }, 'TikTok', 45).durationSec,
    ).toBe(45);
    expect(
      validateAdaptation({ durationSec: 60 }, 'TikTok', 45).durationSec,
    ).toBe(60);
  });

  it('never leaves the title empty, even with no usable input', () => {
    expect(validateAdaptation({}, 'TikTok', 30).title.length).toBeGreaterThan(
      0,
    );
    expect(
      validateAdaptation({ title: '   ' }, 'TikTok', 30).title.length,
    ).toBeGreaterThan(0);
  });

  it('drops non-string entries from structure/scenes instead of persisting them', () => {
    const result = validateAdaptation(
      {
        structure: ['hook', 1, null, 'cta'],
        scenes: [{ nested: true }, 'wide shot'],
      },
      'TikTok',
      30,
    );

    expect(result.structure).toEqual(['hook', 'cta']);
    expect(result.scenes).toEqual(['wide shot']);
  });

  it('caps unbounded text so a runaway generation cannot bloat storage', () => {
    const result = validateAdaptation(
      { script: 'x'.repeat(10_000), title: 'y'.repeat(1_000) },
      'TikTok',
      30,
    );

    expect(result.script.length).toBeLessThanOrEqual(2000);
    expect(result.title.length).toBeLessThanOrEqual(160);
  });
});
