import { Injectable } from '@angular/core';
import { ViralVideo } from '../domain/viral-video.model';

const MOCK_VIDEOS: ViralVideo[] = [
  {
    id: 'v1',
    title: '3 padel volleys that win points instantly',
    platform: 'TikTok',
    views: 182_400,
    likes: 14_220,
    durationSeconds: 38,
    description: 'High-energy tutorial showing three volley patterns that consistently win points at club level.',
    createdAt: '2026-03-10',
  },
  {
    id: 'v2',
    title: 'Why your bandeja is floating (fix in 20s)',
    platform: 'Instagram',
    views: 96_120,
    likes: 7_840,
    durationSeconds: 24,
    description: 'Quick breakdown of the 2 most common bandeja mistakes and how to add weight to the shot.',
    createdAt: '2026-03-12',
  },
  {
    id: 'v3',
    title: 'Padel positioning: the “W” shape explained',
    platform: 'TikTok',
    views: 52_880,
    likes: 2_910,
    durationSeconds: 42,
    description: 'Animated court overlay that explains the ideal “W” positioning for doubles and when to break it.',
    createdAt: '2026-03-07',
  },
  {
    id: 'v4',
    title: 'Warm-up routine before a match (2 min)',
    platform: 'TikTok',
    views: 41_220,
    likes: 3_201,
    durationSeconds: 112,
    description: 'On-court warm-up that hits mobility, timing and touch so you don’t waste the first two games.',
    createdAt: '2026-03-05',
  },
  {
    id: 'v5',
    title: 'Stop camping at the net in padel',
    platform: 'Instagram',
    views: 134_500,
    likes: 10_430,
    durationSeconds: 31,
    description: 'Coaching-style reel that shows why you keep getting lobbed and how to fix your recovery steps.',
    createdAt: '2026-03-05',
  },
];

@Injectable({ providedIn: 'root' })
export class ContentService {
  async listViralVideos(): Promise<ViralVideo[]> {
    return MOCK_VIDEOS;
  }
}

