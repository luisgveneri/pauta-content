import { DatePipe, DecimalPipe, PercentPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { ActivatedRoute, Router } from '@angular/router';
import { LineChartComponent, LineChartPoint } from '../../shared/ui/line-chart/line-chart.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { InstagramPost } from './domain/instagram.model';
import { InstagramStore } from './state/instagram.store';
import { PostDetailDialogComponent } from './ui/post-detail-dialog.component';

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  denied: 'Cancelaste la conexión con Facebook.',
  failed: 'No se pudo completar la conexión con Facebook. Inténtalo de nuevo.',
};

const SORT_VALUE: Record<string, (post: InstagramPost) => number | string> = {
  mediaType: (post) => post.mediaProductType || post.mediaType,
  postedAt: (post) => new Date(post.postedAt).getTime(),
  reach: (post) => post.reach,
  engagement: (post) => post.performance?.engagementRate ?? -1,
  performance: (post) => post.performance?.performanceIndex ?? -1,
};

@Component({
  selector: 'app-instagram-page',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatTabsModule,
    MatTableModule,
    MatSortModule,
    MatChipsModule,
    MatIconModule,
    LineChartComponent,
    PageHeaderComponent,
    DecimalPipe,
    DatePipe,
    PercentPipe,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './instagram.page.html',
})
export class InstagramPage implements OnInit {
  protected readonly store = inject(InstagramStore);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly oauthMessage = signal<string | null>(null);

  ngOnInit() {
    const params = this.route.snapshot.queryParamMap;
    const igError = params.get('igError');
    if (igError) {
      this.oauthMessage.set(OAUTH_ERROR_MESSAGES[igError] ?? OAUTH_ERROR_MESSAGES['failed']);
    } else if (params.get('igConnected')) {
      this.oauthMessage.set('¡Cuenta de Instagram conectada!');
    }
    if (igError || params.get('igConnected')) {
      void this.router.navigate([], { queryParams: {}, replaceUrl: true });
    }
  }

  protected readonly displayedColumns = [
    'thumbnail',
    'caption',
    'mediaType',
    'postedAt',
    'reach',
    'engagement',
    'performance',
  ] as const;

  protected readonly currentSort = signal<Sort>({ active: 'performance', direction: 'desc' });

  protected readonly sortedPosts = computed(() => {
    const posts = this.store.posts();
    const sort = this.currentSort();
    const valueOf = SORT_VALUE[sort.active];
    if (!sort.direction || !valueOf) return posts;

    const dir = sort.direction === 'asc' ? 1 : -1;
    return [...posts].sort((a, b) => {
      const va = valueOf(a);
      const vb = valueOf(b);
      if (va < vb) return -dir;
      if (va > vb) return dir;
      return 0;
    });
  });

  protected onSortChange(sort: Sort) {
    this.currentSort.set(sort);
  }

  protected followersTrend(): LineChartPoint[] {
    return this.store.trends().map((t) => ({
      label: new Date(t.capturedAt).toLocaleDateString(),
      value: t.followersCount,
    }));
  }

  protected reachTrend(): LineChartPoint[] {
    return this.store.trends().map((t) => ({
      label: new Date(t.capturedAt).toLocaleDateString(),
      value: t.reachDay ?? 0,
    }));
  }

  protected connectViaOAuth() {
    void this.store.connectViaOAuth();
  }

  protected openPost(post: InstagramPost) {
    this.dialog.open(PostDetailDialogComponent, {
      data: { post },
      width: '600px',
    });
  }
}
