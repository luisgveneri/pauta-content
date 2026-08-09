import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { formatCompactNumber } from '../../shared/format-compact-number';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { TREND_SOURCE_LABELS, TREND_STATUS_LABELS } from './domain/trend.model';
import { ViralIntelligenceStore } from './state/viral-intelligence.store';

@Component({
  selector: 'app-trend-detail-page',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatProgressBarModule, DatePipe, DecimalPipe, RouterLink, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './trend-detail.page.html',
})
export class TrendDetailPage implements OnInit {
  protected readonly store = inject(ViralIntelligenceStore);
  private readonly route = inject(ActivatedRoute);

  protected readonly sourceLabels = TREND_SOURCE_LABELS;
  protected readonly statusLabels = TREND_STATUS_LABELS;
  protected readonly formatCompactNumber = formatCompactNumber;

  protected readonly engagementRate = computed(() => {
    const trend = this.store.currentTrend();
    if (!trend || trend.views <= 0) return 0;
    return ((trend.likes + trend.comments + trend.shares + trend.saves) / trend.views) * 100;
  });

  protected readonly relativePerformanceLabel = computed(() => {
    const rp = this.store.currentTrend()?.relativePerformance;
    if (rp === null || rp === undefined) return 'Unknown — no baseline available for this account';
    return `${rp.toFixed(1)}x this account's usual views`;
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      void this.store.loadOne(id);
    }
  }

  protected adapt() {
    const trend = this.store.currentTrend();
    if (trend) {
      void this.store.adaptTrend(trend.id);
    }
  }

  protected addToPlanner() {
    void this.store.planAdaptation({});
  }
}
