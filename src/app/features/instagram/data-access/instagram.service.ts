import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiClient } from '../../../core/http/api-client.service';
import { apiEndpoints } from '../../../core/http/api-endpoints';
import {
  InstagramAccountAnalysisPayload,
  InstagramAnalysis,
  InstagramPost,
  InstagramPostAnalysisPayload,
  InstagramStatus,
  InstagramTrendPoint,
  SyncResult,
} from '../domain/instagram.model';

@Injectable({ providedIn: 'root' })
export class InstagramService {
  private readonly api = inject(ApiClient);

  getStatus(): Promise<InstagramStatus> {
    return firstValueFrom(this.api.get<InstagramStatus>(apiEndpoints.instagram.status));
  }

  connect(accessToken: string, pageId?: string): Promise<InstagramStatus> {
    return firstValueFrom(
      this.api.post<InstagramStatus>(apiEndpoints.instagram.connect, { accessToken, pageId: pageId || undefined }),
    );
  }

  getOAuthConnectUrl(): Promise<{ url: string }> {
    return firstValueFrom(this.api.get<{ url: string }>(apiEndpoints.instagram.oauthConnect));
  }

  disconnect(): Promise<{ connected: false }> {
    return firstValueFrom(this.api.delete<{ connected: false }>(apiEndpoints.instagram.connect));
  }

  sync(): Promise<SyncResult> {
    return firstValueFrom(this.api.post<SyncResult>(apiEndpoints.instagram.sync, {}));
  }

  listPosts(opts?: { mediaType?: string; sort?: 'performance' | 'recent' }): Promise<InstagramPost[]> {
    return firstValueFrom(
      this.api.get<InstagramPost[]>(apiEndpoints.instagram.posts, {
        mediaType: opts?.mediaType,
        sort: opts?.sort,
      }),
    );
  }

  getPost(id: string): Promise<InstagramPost> {
    return firstValueFrom(this.api.get<InstagramPost>(apiEndpoints.instagram.post(id)));
  }

  getPostAnalysis(id: string): Promise<InstagramAnalysis<InstagramPostAnalysisPayload>> {
    return firstValueFrom(
      this.api.get<InstagramAnalysis<InstagramPostAnalysisPayload>>(apiEndpoints.instagram.postAnalysis(id)),
    );
  }

  analyzePost(id: string): Promise<InstagramAnalysis<InstagramPostAnalysisPayload>> {
    return firstValueFrom(
      this.api.post<InstagramAnalysis<InstagramPostAnalysisPayload>>(apiEndpoints.instagram.postAnalysis(id), {}),
    );
  }

  getTrends(days = 90): Promise<InstagramTrendPoint[]> {
    return firstValueFrom(this.api.get<InstagramTrendPoint[]>(apiEndpoints.instagram.trends, { days }));
  }

  getAccountAnalysis(): Promise<InstagramAnalysis<InstagramAccountAnalysisPayload>> {
    return firstValueFrom(
      this.api.get<InstagramAnalysis<InstagramAccountAnalysisPayload>>(apiEndpoints.instagram.analysis),
    );
  }

  analyzeAccount(): Promise<InstagramAnalysis<InstagramAccountAnalysisPayload>> {
    return firstValueFrom(
      this.api.post<InstagramAnalysis<InstagramAccountAnalysisPayload>>(apiEndpoints.instagram.analysis, {}),
    );
  }
}
