import { Platform } from '../../../shared/models/platform.model';

export type ViralVideo = {
  id: string;
  title: string;
  platform: Platform;
  views: number;
  likes: number;
  /** Duration in seconds */
  durationSeconds: number;
  description: string;
  createdAt: string; // ISO date
};

