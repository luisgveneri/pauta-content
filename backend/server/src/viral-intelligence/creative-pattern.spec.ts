import { validateCreativePattern } from './creative-pattern';

describe('validateCreativePattern', () => {
  it('accepts a well-formed payload and normalizes casing/spacing to the canonical slug', () => {
    const result = validateCreativePattern({
      hookType: 'Mistake Based',
      hookText: '3 mistakes beginners make',
      format: 'educational_list',
      topic: 'Beginner Mistakes',
      emotion: 'curiosity',
      mechanism: 'fear of missing out',
      structure: ['hook', 'mistake', 'mistake', 'mistake', 'solution', 'cta'],
      ctaType: 'save',
      editingStyle: 'fast_cuts',
      visualStyle: 'demonstration',
      pacing: 'fast',
    });

    expect(result.hookType).toBe('mistake_based');
    expect(result.format).toBe('educational_list');
    expect(result.topic).toBe('beginner_mistakes');
    expect(result.structure).toEqual([
      'hook',
      'mistake',
      'mistake',
      'mistake',
      'solution',
      'cta',
    ]);
  });

  it('falls back to "other" for enum fields the model invents', () => {
    const result = validateCreativePattern({
      hookType: 'something_the_model_made_up',
      format: 'interpretive_dance',
      emotion: 'schadenfreude',
      ctaType: 'subscribe_and_ring_the_bell',
      editingStyle: 'jump_cuts_with_lasers',
      visualStyle: 'hologram',
      pacing: 'chaotic',
    });

    expect(result.hookType).toBe('other');
    expect(result.format).toBe('other');
    expect(result.emotion).toBe('other');
    expect(result.ctaType).toBe('other');
    expect(result.editingStyle).toBe('other');
    expect(result.visualStyle).toBe('other');
    expect(result.pacing).toBe('other');
  });

  it('never throws on completely empty, null, or non-object input', () => {
    expect(() => validateCreativePattern({})).not.toThrow();
    expect(() => validateCreativePattern(null)).not.toThrow();
    expect(() => validateCreativePattern(undefined)).not.toThrow();
    expect(() => validateCreativePattern('not even an object')).not.toThrow();
    expect(() => validateCreativePattern(42)).not.toThrow();
    expect(() => validateCreativePattern([1, 2, 3])).not.toThrow();
  });

  it('produces safe, fully-populated defaults for missing input', () => {
    const result = validateCreativePattern({});

    expect(result.topic).toBe('other');
    expect(result.hookText).toBe('');
    expect(result.mechanism).toBe('');
    expect(result.structure).toEqual([]);
    expect(
      Object.values(result).every((v) => v !== undefined && v !== null),
    ).toBe(true);
  });

  it('drops non-string entries out of structure instead of persisting them', () => {
    const result = validateCreativePattern({
      structure: ['hook', 42, null, { nested: true }, 'cta', ''],
    });

    expect(result.structure).toEqual(['hook', 'cta']);
  });

  it('caps unbounded text fields so a runaway generation cannot bloat storage', () => {
    const result = validateCreativePattern({
      hookText: 'x'.repeat(5000),
      mechanism: 'y'.repeat(5000),
      structure: Array.from({ length: 50 }, (_, i) => `step ${i}`),
    });

    expect(result.hookText.length).toBeLessThanOrEqual(240);
    expect(result.mechanism.length).toBeLessThanOrEqual(240);
    expect(result.structure.length).toBeLessThanOrEqual(12);
  });

  it('is not fooled by prototype-pollution-shaped keys', () => {
    const malicious = JSON.parse(
      '{"__proto__": {"polluted": true}, "format": "tutorial"}',
    ) as unknown;
    const result = validateCreativePattern(malicious);

    expect(result.format).toBe('tutorial');
    expect((result as Record<string, unknown>)['polluted']).toBeUndefined();
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });
});
