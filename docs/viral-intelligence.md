# Viral Intelligence

Discovers content that's working elsewhere, scores it in a way that isn't fooled by raw view counts, extracts *why* it works, and turns that pattern into an original padel idea a specific organization can publish and track.

Pipeline: **Discovery → Scoring → Pattern extraction → Recommendation → Adaptation → Planning → (future) Measurement.**

Full design rationale lives in the approved plan this module was built from: `/Users/luismiguel/.claude/plans/delightful-soaring-lighthouse.md`. This document is the reference for maintaining and extending it.

## Why views aren't the ranking signal

A 500K-view video from a 10K-follower account is a stronger signal than 5M views from a 20M-follower account performing at its own normal. Every ranking in this module — global score, personalized recommendations — is built around **performance relative to the account's own baseline**, not absolute reach. `TrendScoringService`'s test suite exists specifically to keep this true (`trend-scoring.service.spec.ts` asserts a small breakout account outranks a huge account at baseline).

## Data model

All entities live in `backend/server/prisma/schema.prisma`.

- **`Trend`** — global catalogue, deliberately *not* organization-scoped. A viral video is the same fact for every org, so it's discovered, scored, and AI-analyzed once. Denormalized scoring fields (`viralScore`, `scoreBreakdown`, `relativePerformance`, `status`) live directly on the row — every list query sorts by them, so they must not be recomputed on read (same call as `InstagramPost`). `isDemo` is kept separate from `source` (TIKTOK/INSTAGRAM/YOUTUBE/MANUAL): `source` says which platform the content is *from*, `isDemo` says whether the row is real or seeded — conflating them would make it impossible to show a realistic multi-platform Discover feed while staying honest that nothing has actually been pulled from a live platform yet.
- **`TrendPattern`** — the AI-extracted creative pattern, 1:1 with `Trend`, permanently cached. A trend is sent to the LLM at most once.
- **`SavedTrend`** / **`TrendAdaptation`** — organization-scoped; this is the isolation boundary (every query filters by `organizationId`).
- **`TrendAdaptation.plannerItemId`** — the feedback loop's spine: `Trend → Adaptation → PlannerItem` is queryable from day one, so a future `PlannerItem → InstagramPost` link closes the attribution chain without a migration.

Two deliberate omissions from the original spec, both explained in the plan: no `TrendSnapshot` table (velocity is derived from `views / ageDays` on a single row; snapshots only earn their place once a real recurring sync exists to fill them) and no `Recommendation` table (recommendations are a cheap function of trends × org state, recomputed on request — persisting them would add staleness for no benefit, since attribution is already carried by `TrendAdaptation`).

## Scoring (`trend-scoring.service.ts`)

Pure, deterministic, zero AI cost — runs on every trend at discovery time. Five weighted components (weights and saturation points are all named constants in `SCORE_WEIGHTS`, nothing is a magic number in the formula):

| Component | What it measures |
|---|---|
| `relativePerformance` | views ÷ the account's median views (or follower count, if no baseline exists) |
| `engagement` | (likes+comments+shares+saves) ÷ views |
| `velocity` | views/day, expressed as a multiple of the account's baseline — not raw views/day, which would let a huge account's absolute volume dominate regardless of whether the post is unusual *for that account* |
| `freshness` | exponential decay, 10-day half-life |
| `amplification` | (shares+saves) ÷ views — a stronger "replicable format" signal than likes |

Each component is log- or linear-normalized to `[0, 1]` and multiplied by its weight; `scoreBreakdown` persists every raw value, normalized value, weight, and contribution so the UI can render *why* a score is 92, not just assert it (see the score breakdown bars on the trend detail page).

`status` (NEW/RISING/HOT/STABLE/DECLINING) is a first classification from age + velocity on the single discovery pass, not a real lifecycle state machine — that needs periodic re-discovery, which is Phase 4 work.

## Providers (`providers/`)

```ts
interface TrendSourceProvider {
  readonly id: string;
  readonly isAvailable: boolean;
  discover(query: TrendDiscoveryQuery): Promise<RawTrend[]>;
}
```

`RawTrend` is platform-neutral — no field exists that only one platform could fill; a provider that can't supply a value (e.g. no median-views baseline) sends `null`, never a guess. `TrendDiscoveryService` iterates every provider where `isAvailable` is true and upserts on `(source, externalId)`, so re-running discovery updates existing rows instead of duplicating them.

**Why there's only a mock provider today:** verified before building anything —
- **TikTok**: the Research API is restricted to verified academic/public-interest institutions; commercial use is explicitly ineligible. The Display API only returns the authenticated user's own videos. No commercial path to trend discovery exists.
- **Instagram**: hashtag search caps at 30 unique hashtags per rolling 7 days, there's no public hashtag-search endpoint, no cross-account analytics, and Meta stripped view counts from single post/reel lookups in 2026.
- **YouTube**: `search.list` + `videos.list` + `channels.list` genuinely work, including `subscriberCount` — the baseline relative performance needs. Quota-limited (10,000 units/day, ~100 searches/day) but workable with caching. This is the recommended first real provider (Phase 4), not TikTok.

Scraping was deliberately not implemented — it violates platform ToS, breaks without warning, and would poison the data every scoring/recommendation decision depends on.

### Adding a real provider

1. Implement `TrendSourceProvider` (e.g. `youtube-trend.provider.ts`), returning `RawTrend[]` with `isDemo: false`.
2. Add it to the factory array in `viral-intelligence.module.ts` (`TREND_SOURCE_PROVIDERS`).
3. Nothing else changes — scoring, patterns, recommendations, and adaptation all operate on `Trend` rows regardless of source.

## AI (reuses the existing multi-provider chain — no second AI system)

Everything routes through the existing `AiService` (`backend/server/src/ai/ai.service.ts`, Groq → Cerebras → Gemini → OpenAI fallback). Two additions:

- **`extractCreativePattern()`** — returns the LLM's raw guess at hook/format/topic/emotion/mechanism/structure/CTA/editing/visual style/pacing.
- **`adaptTrendForOrganization()`** — returns a full original idea (title, hook, concept, structure, scenes, script, CTA, caption, platform, duration, rationale) in one call, given the validated pattern and the org's context (type, active campaign, recent content, top captions). Explicitly instructed to reuse the *pattern*, never the source's wording.

Both methods return **unvalidated** `Record<string, unknown>` — `AiService` only talks to the model. Validation is domain-specific and lives in the viral-intelligence module:

- `creative-pattern.ts#validateCreativePattern()` — normalizes casing/spacing, maps anything outside the closed vocabularies (`FORMATS`, `EMOTIONS`, `CTA_TYPES`, `PACINGS`, `EDITING_STYLES`, `HOOK_TYPES`) to `'other'`, bounds every string/array length. Never throws.
- `adaptation.ts#validateAdaptation()` — same posture: bounds text length, drops non-string list entries, falls back to the source trend's platform/duration when the model omits or invents one.

**No raw LLM JSON is ever persisted or shown.** Both validators have dedicated test suites covering malformed and adversarial input (`creative-pattern.spec.ts`, `adaptation.spec.ts`).

### Cost control

1. Deterministic scoring runs on every trend; AI only runs on trends someone actually opens or adapts.
2. `TrendPattern` is 1:1 and permanently cached (`TrendPatternService.analyze()` returns the cached row if one exists, never re-calls the model).
3. `AdaptationService.adapt()` calls `TrendPatternService.analyze()` internally, so "Adapt" never requires a separate manual "Analyze" step, but still never re-analyzes an already-analyzed trend.

## Recommendations (`recommendation.service.ts`)

`RecommendationService.score()` is a **pure function** — no I/O — which is what makes ranking, degradation, and CLUB-vs-CREATOR behavior unit-testable without a database (`recommendation.service.spec.ts`). `getRecommendations()` is the thin orchestration layer that builds a `RecommendationContext` from the org's data and calls `score()` against a bounded candidate pool (top 60 globally-scored trends — personalization re-ranks what discovery already found promising, it doesn't re-score everything).

Six weighted components:

| Component | Signal |
|---|---|
| `trendPerformance` | the trend's own global `viralScore` |
| `accountFit` | reuses `PerformanceService.analyze()` (the same engine behind Instagram account analysis) — the trend's hashtag-count bucket compared against the org's own `byHashtagCount` lift |
| `historicalFit` | keyword overlap between the trend's title/hashtags/topic and the org's top-performing Instagram captions |
| `contentGap` | whether the org has covered this topic in the last 30 days (planner titles + Instagram captions) |
| `freshness` | same decay curve as the trend's own score (`freshnessScore()`, exported from `trend-scoring.service.ts` so both use one curve) |
| `orgTypeFit` | keyword match against CLUB vs. CREATOR vocabularies, boosted further if the trend matches an active campaign's objective |

**Graceful degradation is load-bearing, not an edge case.** With no Instagram connected, `accountFit` and `historicalFit` resolve to **0.5 (neutral)**, never 0 — a missing signal must never read as "this is a bad fit." The response carries an explicit `personalizationLevel: 'full' | 'partial' | 'generic'`, and the frontend shows a banner explaining which level is active rather than silently ranking on trend performance alone.

## API

All under `/api/viral-intelligence`, org-scoped via `@CurrentOrg()`; no `@RequireOrgType()` guard — this module serves both CLUB and CREATOR, with the CLUB/CREATOR difference expressed in scoring weights, not access control.

```
GET    /trends                    Discover — filters: source, format, topic, minScore, maxDuration, sort
GET    /trends/:id                Detail (includes pattern, if analyzed)
POST   /trends/:id/analyze        AI pattern extraction (cached — returns existing pattern if present)
GET    /recommendations           For You — ranked + explained, org-scoped
GET    /saved
POST   /trends/:id/save
DELETE /trends/:id/save
POST   /trends/:id/adapt          → TrendAdaptation (auto-runs analyze() first if needed)
POST   /adaptations/:id/plan      → PlannerItem, links back (idempotent, transactional)
POST   /mock/seed                 Seeds ~30 curated demo trends
DELETE /mock/seed                 Clears demo trends (isDemo: true only)
```

`POST /adaptations/:id/plan` mirrors `CampaignsService.confirmSlot()` exactly: a `$transaction` with a conditional `updateMany` (`plannerItemId: null`) acting as an optimistic lock, so two near-simultaneous "Add to Planner" clicks can't both win.

## Frontend

`src/app/features/viral-intelligence/`, same `data-access` / `domain` / `state` / `ui` layering as every other feature. One signal store (`ViralIntelligenceStore`) backs all three tabs plus the detail page.

- **For You** (default tab) — `RecommendationCardComponent`: match %, reasons list, save toggle.
- **Discover** — filters (platform, sort, min score) + `TrendCardComponent` grid. Loaded lazily on first tab open (the one dataset large/filtered enough to defer); For You and Saved load eagerly since they're small, bounded lists and this keeps bookmark state consistent across tabs without waiting for a tab visit.
- **Saved** — same `TrendCardComponent`, always `saved=true`.
- **Detail** (`/viral-intelligence/:id`) — performance → why it's viral (score breakdown bars) → creative pattern → adaptation (generate → review → Add to Planner).

The reverse link is visible too: `PlannerService.findAll()` includes `trendAdaptation.trend`, and the Planner list shows a "🔥 From Viral Intelligence: {trend title}" link back to the source on any item that originated this way.

## Running demo data

From the Discover tab (or `POST /api/viral-intelligence/mock/seed` directly): seeds ~30 curated trends spanning padel/tennis/fitness/business/humor/lifestyle across TikTok/Instagram/YouTube, with durations from 16s to 780s and ages from 1 to 60 days. The dataset is curated, not randomized, and deliberately includes:
- small accounts with breakout relative performance (e.g. an 8.2K-follower account at 43x its own baseline)
- huge accounts posting huge-but-unremarkable-for-them numbers (a 5.2M-follower account at ~1.05x baseline, despite 6.1M raw views)

so that a naive views-sorted feed and the actual relative-performance-sorted ranking visibly disagree — proof the scoring pipeline is doing something, not just echoing view counts. `DELETE /api/viral-intelligence/mock/seed` clears only `isDemo: true` rows.

## Known limitations (honest, not hidden)

- **No real discovery source is connected.** Everything is demo data until a YouTube provider (or another legitimate source) lands per Phase 4.
- **No trend lifecycle engine.** `status` is a one-time classification at discovery, not tracked transitions over time (needs periodic re-scoring via snapshots, Phase 4).
- **No feedback loop yet.** `PlannerItem → InstagramPost` isn't linked, so "trends Pauta recommended performed +X%" isn't measurable yet — the data model (`TrendAdaptation.plannerItemId`) is ready for it, Phase 5 work.
- **No queue/scheduler infrastructure exists in this codebase** (no BullMQ, no `@nestjs/schedule`), so every pipeline stage is an explicitly-triggered endpoint rather than a background job. Deliberate — introducing one wasn't justified for the MVP's actual load, per the approved plan.
- **`accountFit`/`historicalFit` are heuristics**, not the full personalization sophistication a mature product would want (e.g. `accountFit` only compares hashtag-count buckets, because that's the one dimension `PerformanceService` already segments that a `Trend` can also be bucketed by — duration, for instance, isn't tracked on `InstagramPost` at all).
