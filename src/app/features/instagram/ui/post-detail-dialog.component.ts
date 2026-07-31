import { DatePipe, DecimalPipe, PercentPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { InstagramService } from '../data-access/instagram.service';
import {
  InstagramAnalysis,
  InstagramPost,
  InstagramPostAnalysisPayload,
} from '../domain/instagram.model';

export type PostDetailDialogData = { post: InstagramPost };

@Component({
  selector: 'app-post-detail-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatProgressBarModule, DecimalPipe, DatePipe, PercentPipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './post-detail-dialog.component.html',
})
export class PostDetailDialogComponent {
  private readonly instagramService = inject(InstagramService);
  protected readonly data = inject<PostDetailDialogData>(MAT_DIALOG_DATA);

  protected readonly post = this.data.post;
  protected readonly analysis = signal<InstagramAnalysis<InstagramPostAnalysisPayload> | null>(null);
  protected readonly loadingAnalysis = signal(true);
  protected readonly generating = signal(false);
  protected readonly generateError = signal<string | null>(null);
  protected readonly imageError = signal(false);

  constructor() {
    void this.loadExistingAnalysis();
  }

  private async loadExistingAnalysis() {
    this.loadingAnalysis.set(true);
    try {
      const analysis = await this.instagramService.getPostAnalysis(this.post.id);
      this.analysis.set(analysis);
    } catch {
      this.analysis.set(null);
    } finally {
      this.loadingAnalysis.set(false);
    }
  }

  async generateAnalysis() {
    this.generating.set(true);
    this.generateError.set(null);
    try {
      const analysis = await this.instagramService.analyzePost(this.post.id);
      this.analysis.set(analysis);
    } catch (error) {
      this.generateError.set(this.extractError(error));
    } finally {
      this.generating.set(false);
    }
  }

  private extractError(error: unknown): string {
    if (error && typeof error === 'object' && 'error' in error) {
      const body = (error as { error?: { message?: string | string[] } }).error;
      if (body?.message) {
        return Array.isArray(body.message) ? body.message.join(' ') : body.message;
      }
    }
    return 'Something went wrong generating the analysis. Please try again.';
  }
}
