import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ViralIntelligenceService } from '../data-access/viral-intelligence.service';
import { Trend } from '../domain/trend.model';
import { ViralIntelligenceStore } from './viral-intelligence.store';

function buildTrend(overrides: Partial<Trend> = {}): Trend {
  return {
    id: 't1',
    source: 'TIKTOK',
    isDemo: true,
    externalId: 'ext-1',
    url: 'https://example.com',
    authorHandle: '@example',
    authorFollowers: 1000,
    authorMedianViews: 1000,
    title: 'Example trend',
    caption: null,
    hashtags: [],
    durationSec: 20,
    thumbnailUrl: null,
    publishedAt: new Date().toISOString(),
    views: 1000,
    likes: 10,
    comments: 1,
    shares: 1,
    saves: 1,
    viralScore: 50,
    scoreBreakdown: null,
    relativePerformance: 1,
    status: 'NEW',
    scoredAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pattern: null,
    ...overrides,
  };
}

describe('ViralIntelligenceStore', () => {
  let service: {
    listTrends: ReturnType<typeof vi.fn>;
    saveTrend: ReturnType<typeof vi.fn>;
    unsaveTrend: ReturnType<typeof vi.fn>;
    listSaved: ReturnType<typeof vi.fn>;
  };
  let store: ViralIntelligenceStore;

  beforeEach(() => {
    service = {
      listTrends: vi.fn().mockResolvedValue([buildTrend()]),
      saveTrend: vi.fn().mockResolvedValue({ saved: true }),
      unsaveTrend: vi.fn().mockResolvedValue({ saved: false }),
      listSaved: vi.fn().mockResolvedValue([]),
    };

    TestBed.configureTestingModule({
      providers: [ViralIntelligenceStore, { provide: ViralIntelligenceService, useValue: service }],
    });
    store = TestBed.inject(ViralIntelligenceStore);
  });

  it('starts with no trends and not loading', () => {
    expect(store.trends()).toEqual([]);
    expect(store.loading()).toBe(false);
  });

  it('loads trends and turns loading off on success', async () => {
    await store.loadTrends();

    expect(store.trends()).toHaveLength(1);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('surfaces a friendly error and turns loading off when the request fails', async () => {
    service.listTrends.mockRejectedValueOnce({ error: { message: 'Boom' } });

    await store.loadTrends();

    expect(store.trends()).toEqual([]);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBe('Boom');
  });

  it('falls back to a generic error message when the backend gives no message', async () => {
    service.listTrends.mockRejectedValueOnce(new Error('network down'));

    await store.loadTrends();

    expect(store.error()).toBe('Something went wrong. Please try again.');
  });

  it('setFilters updates filters and re-fetches with the new filters', async () => {
    await store.setFilters({ sort: 'recent', source: 'YOUTUBE' });

    expect(store.filters()).toEqual({ sort: 'recent', source: 'YOUTUBE' });
    expect(service.listTrends).toHaveBeenCalledWith({ sort: 'recent', source: 'YOUTUBE' });
  });

  it('toggleSave calls save when not yet saved, then reloads the saved list', async () => {
    await store.toggleSave('t1');

    expect(service.saveTrend).toHaveBeenCalledWith('t1');
    expect(service.unsaveTrend).not.toHaveBeenCalled();
    expect(service.listSaved).toHaveBeenCalled();
    expect(store.savingTrendId()).toBeNull();
  });

  it('toggleSave calls unsave when the trend is already in the saved set', async () => {
    service.listSaved.mockResolvedValueOnce([buildTrend({ id: 't1' })]);
    await store.loadSaved();

    await store.toggleSave('t1');

    expect(service.unsaveTrend).toHaveBeenCalledWith('t1');
    expect(service.saveTrend).not.toHaveBeenCalled();
  });
});
