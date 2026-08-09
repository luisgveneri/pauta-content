import { ScoringInput, TrendScoringService } from './trend-scoring.service';

describe('TrendScoringService', () => {
  let service: TrendScoringService;
  const now = new Date('2026-08-09T00:00:00.000Z');

  beforeEach(() => {
    service = new TrendScoringService();
  });

  function daysAgo(days: number): Date {
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  }

  function baseInput(overrides: Partial<ScoringInput> = {}): ScoringInput {
    return {
      views: 10_000,
      likes: 500,
      comments: 20,
      shares: 50,
      saves: 100,
      authorFollowers: 10_000,
      authorMedianViews: 10_000,
      publishedAt: daysAgo(3),
      ...overrides,
    };
  }

  it('scores a huge-relative-performance small account higher than a huge-absolute-views big account near its own baseline', () => {
    // The exact "views != virality" scenario from the spec: 800K on a
    // 20K-follower account vs. 5M on a 20M-follower account performing at
    // its own normal.
    const breakout = service.score(
      baseInput({
        views: 800_000,
        authorFollowers: 20_000,
        authorMedianViews: 30_000,
        likes: 60_000,
        comments: 2_000,
        shares: 9_000,
        saves: 15_000,
        publishedAt: daysAgo(3),
      }),
      now,
    );

    const businessAsUsual = service.score(
      baseInput({
        views: 5_000_000,
        authorFollowers: 20_000_000,
        authorMedianViews: 4_800_000,
        likes: 200_000,
        comments: 4_000,
        shares: 20_000,
        saves: 30_000,
        publishedAt: daysAgo(3),
      }),
      now,
    );

    expect(breakout.relativePerformance).toBeGreaterThan(
      businessAsUsual.relativePerformance,
    );
    expect(breakout.viralScore).toBeGreaterThan(businessAsUsual.viralScore);
  });

  it('is monotonically increasing in relative performance, engagement/amplification rates held constant', () => {
    // "All else equal" has to mean equal *rates*, not equal raw counts — at
    // fixed raw likes/shares, growing views alone mechanically tanks the
    // engagement and amplification components, which would make this a test
    // of a different, unrelated effect. Scaling interactions with views
    // isolates the relative-performance component the test is about.
    const scenario = (views: number) =>
      service.score(
        baseInput({
          views,
          authorMedianViews: 10_000,
          likes: views * 0.05,
          shares: views * 0.005,
          saves: views * 0.01,
        }),
        now,
      );

    const low = scenario(5_000);
    const mid = scenario(20_000);
    const high = scenario(200_000);

    expect(mid.relativePerformance).toBeGreaterThan(low.relativePerformance);
    expect(high.relativePerformance).toBeGreaterThan(mid.relativePerformance);
    expect(mid.viralScore).toBeGreaterThan(low.viralScore);
    expect(high.viralScore).toBeGreaterThan(mid.viralScore);
  });

  it('decays score for older content, all else equal', () => {
    const fresh = service.score(baseInput({ publishedAt: daysAgo(1) }), now);
    const stale = service.score(baseInput({ publishedAt: daysAgo(80) }), now);

    expect(fresh.viralScore).toBeGreaterThan(stale.viralScore);
  });

  it('falls back to followers as the baseline when authorMedianViews is null, without crashing', () => {
    const result = service.score(
      baseInput({
        authorMedianViews: null,
        authorFollowers: 50_000,
        views: 40_000,
      }),
      now,
    );

    expect(result.relativePerformance).toBeCloseTo(40_000 / 50_000, 5);
    expect(Number.isFinite(result.viralScore)).toBe(true);
  });

  it('returns a zero-ish score without throwing when there is no baseline at all', () => {
    const result = service.score(
      baseInput({
        authorMedianViews: null,
        authorFollowers: 0,
        views: 100_000,
      }),
      now,
    );

    expect(result.relativePerformance).toBe(0);
    expect(Number.isFinite(result.viralScore)).toBe(true);
  });

  it('never returns a score outside [0, 100]', () => {
    const extreme = service.score(
      baseInput({
        views: 50_000_000,
        authorMedianViews: 1,
        authorFollowers: 1,
        likes: 40_000_000,
        comments: 1_000_000,
        shares: 5_000_000,
        saves: 5_000_000,
        publishedAt: daysAgo(0.1),
      }),
      now,
    );
    const nothing = service.score(
      baseInput({
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        publishedAt: daysAgo(500),
      }),
      now,
    );

    expect(extreme.viralScore).toBeLessThanOrEqual(100);
    expect(extreme.viralScore).toBeGreaterThanOrEqual(0);
    expect(nothing.viralScore).toBeGreaterThanOrEqual(0);
    expect(nothing.viralScore).toBeLessThanOrEqual(100);
  });

  it('breaks the score down into components whose weighted contributions sum to the total', () => {
    const result = service.score(baseInput(), now);
    const sumOfContributions = result.scoreBreakdown.components.reduce(
      (sum, c) => sum + c.contribution,
      0,
    );

    expect(Math.round(sumOfContributions * 100)).toBe(
      result.scoreBreakdown.total,
    );
    expect(result.scoreBreakdown.components).toHaveLength(5);
    for (const component of result.scoreBreakdown.components) {
      expect(component.normalized).toBeGreaterThanOrEqual(0);
      expect(component.normalized).toBeLessThanOrEqual(1);
    }
  });

  describe('status derivation', () => {
    it('classifies a same-day post as NEW', () => {
      expect(
        service.score(baseInput({ publishedAt: daysAgo(0.5) }), now).status,
      ).toBe('NEW');
    });

    it('classifies a fast-climbing recent post as HOT', () => {
      const result = service.score(
        baseInput({
          publishedAt: daysAgo(5),
          views: 500_000,
          authorMedianViews: 10_000,
        }),
        now,
      );
      expect(result.status).toBe('HOT');
    });

    it('classifies a slow recent post as RISING, not HOT', () => {
      const result = service.score(
        baseInput({
          publishedAt: daysAgo(5),
          views: 9_000,
          authorMedianViews: 10_000,
        }),
        now,
      );
      expect(result.status).toBe('RISING');
    });

    it('classifies month-old content as STABLE and very old content as DECLINING', () => {
      expect(
        service.score(baseInput({ publishedAt: daysAgo(20) }), now).status,
      ).toBe('STABLE');
      expect(
        service.score(baseInput({ publishedAt: daysAgo(60) }), now).status,
      ).toBe('DECLINING');
    });
  });
});
