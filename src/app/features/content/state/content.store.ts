import { Injectable, computed, inject, signal } from '@angular/core';
import { ContentService } from '../data-access/content.service';
import { ViralVideo } from '../domain/viral-video.model';

type ContentState = {
  loading: boolean;
  videos: ViralVideo[];
};

@Injectable({ providedIn: 'root' })
export class ContentStore {
  private readonly contentService = inject(ContentService);

  private readonly _state = signal<ContentState>({
    loading: true,
    videos: [],
  });

  readonly loading = computed(() => this._state().loading);
  readonly videos = computed(() => this._state().videos);

  readonly totals = computed(() => {
    const videos = this._state().videos;
    return {
      count: videos.length,
      views: videos.reduce((sum, v) => sum + v.views, 0),
      likes: videos.reduce((sum, v) => sum + v.likes, 0),
    };
  });

  constructor() {
    void this.refresh();
  }

  async refresh() {
    this._state.update((s) => ({ ...s, loading: true }));
    const videos = await this.contentService.listViralVideos();
    this._state.set({ loading: false, videos });
  }
}

