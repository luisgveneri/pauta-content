import { Injectable } from '@nestjs/common';

export type PerformancePost = {
  id: string;
  mediaType: string;
  reach: number;
  totalInteractions: number;
  postedHour: number;
  postedDow: number;
  captionLength: number;
  hashtagCount: number;
};

export type Classification = 'over' | 'normal' | 'under';

export type PostPerformance = {
  postId: string;
  engagementRate: number;
  performanceIndex: number;
  classification: Classification;
};

export type SegmentStat = {
  segment: string;
  n: number;
  medianEngagement: number;
  lift: number;
};

export type PerformanceAnalysis = {
  baselineEngagementRate: number;
  posts: PostPerformance[];
  segments: {
    byMediaType: SegmentStat[];
    byPostedHour: SegmentStat[];
    byPostedDow: SegmentStat[];
    byCaptionLength: SegmentStat[];
    byHashtagCount: SegmentStat[];
  };
};

const OVER_THRESHOLD = 1.25;
const UNDER_THRESHOLD = 0.75;
const MIN_SEGMENT_SIZE = 3;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function hourBucket(hour: number): string {
  if (hour < 6) return '00-05';
  if (hour < 12) return '06-11';
  if (hour < 18) return '12-17';
  return '18-23';
}

const DOW_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function captionLengthBucket(length: number): string {
  if (length <= 50) return '0-50';
  if (length <= 150) return '51-150';
  if (length <= 300) return '151-300';
  return '300+';
}

function hashtagCountBucket(count: number): string {
  if (count === 0) return '0';
  if (count <= 3) return '1-3';
  if (count <= 8) return '4-8';
  return '9+';
}

@Injectable()
export class PerformanceService {
  analyze(posts: PerformancePost[], followersCount: number): PerformanceAnalysis {
    const engagementByPostId = new Map<string, number>();
    for (const post of posts) {
      engagementByPostId.set(post.id, this.engagementRate(post, followersCount));
    }

    const baseline = median([...engagementByPostId.values()]);

    const postPerformances: PostPerformance[] = posts.map((post) => {
      const engagementRate = engagementByPostId.get(post.id) ?? 0;
      const performanceIndex = baseline > 0 ? engagementRate / baseline : 0;
      return {
        postId: post.id,
        engagementRate,
        performanceIndex,
        classification: this.classify(performanceIndex),
      };
    });

    return {
      baselineEngagementRate: baseline,
      posts: postPerformances,
      segments: {
        byMediaType: this.segmentBy(posts, engagementByPostId, baseline, (p) => p.mediaType),
        byPostedHour: this.segmentBy(posts, engagementByPostId, baseline, (p) => hourBucket(p.postedHour)),
        byPostedDow: this.segmentBy(posts, engagementByPostId, baseline, (p) => DOW_LABELS[p.postedDow]),
        byCaptionLength: this.segmentBy(posts, engagementByPostId, baseline, (p) =>
          captionLengthBucket(p.captionLength),
        ),
        byHashtagCount: this.segmentBy(posts, engagementByPostId, baseline, (p) =>
          hashtagCountBucket(p.hashtagCount),
        ),
      },
    };
  }

  private engagementRate(post: PerformancePost, followersCount: number): number {
    const denominator = post.reach > 0 ? post.reach : followersCount;
    if (denominator <= 0) return 0;
    return post.totalInteractions / denominator;
  }

  private classify(performanceIndex: number): Classification {
    if (performanceIndex >= OVER_THRESHOLD) return 'over';
    if (performanceIndex <= UNDER_THRESHOLD && performanceIndex > 0) return 'under';
    return 'normal';
  }

  private segmentBy(
    posts: PerformancePost[],
    engagementByPostId: Map<string, number>,
    baseline: number,
    keyFn: (post: PerformancePost) => string,
  ): SegmentStat[] {
    const groups = new Map<string, number[]>();
    for (const post of posts) {
      const key = keyFn(post);
      const list = groups.get(key) ?? [];
      list.push(engagementByPostId.get(post.id) ?? 0);
      groups.set(key, list);
    }

    const stats: SegmentStat[] = [];
    for (const [segment, values] of groups) {
      if (values.length < MIN_SEGMENT_SIZE) continue;
      const medianEngagement = median(values);
      stats.push({
        segment,
        n: values.length,
        medianEngagement,
        lift: baseline > 0 ? medianEngagement / baseline : 0,
      });
    }
    return stats.sort((a, b) => b.lift - a.lift);
  }
}
