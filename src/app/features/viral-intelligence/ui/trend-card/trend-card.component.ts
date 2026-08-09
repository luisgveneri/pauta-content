import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { formatCompactNumber } from '../../../../shared/format-compact-number';
import { TREND_SOURCE_LABELS, TREND_STATUS_LABELS, Trend, TrendStatus } from '../../domain/trend.model';

const STATUS_CLASSES: Record<TrendStatus, string> = {
  NEW: 'bg-sky-50 text-sky-700',
  RISING: 'bg-amber-50 text-amber-700',
  HOT: 'bg-rose-50 text-rose-700',
  STABLE: 'bg-slate-100 text-slate-600',
  DECLINING: 'bg-slate-100 text-slate-400',
  EXPIRED: 'bg-slate-100 text-slate-400',
};

@Component({
  selector: 'app-trend-card',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './trend-card.component.html',
})
export class TrendCardComponent {
  readonly trend = input.required<Trend>();
  readonly saved = input(false);
  readonly savePending = input(false);
  readonly toggleSave = output<void>();

  protected onToggleSave(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.toggleSave.emit();
  }

  protected readonly sourceLabel = computed(() => TREND_SOURCE_LABELS[this.trend().source]);
  protected readonly statusLabel = computed(() => TREND_STATUS_LABELS[this.trend().status]);
  protected readonly statusClass = computed(() => STATUS_CLASSES[this.trend().status]);

  protected readonly viewsLabel = computed(() => formatCompactNumber(this.trend().views));
  protected readonly likesLabel = computed(() => formatCompactNumber(this.trend().likes));

  protected readonly engagementLabel = computed(() => {
    const t = this.trend();
    if (t.views <= 0) return '0%';
    const rate = (t.likes + t.comments + t.shares + t.saves) / t.views;
    return `${(rate * 100).toFixed(1)}%`;
  });

  protected readonly relativePerformanceLabel = computed(() => {
    const rp = this.trend().relativePerformance;
    if (rp === null || rp <= 1) return null;
    const percentAbove = Math.round((rp - 1) * 100);
    return `+${formatCompactNumber(percentAbove)}%`;
  });

  protected readonly scoreClass = computed(() => {
    const score = this.trend().viralScore;
    if (score >= 80) return 'bg-rose-50 text-rose-700';
    if (score >= 60) return 'bg-amber-50 text-amber-700';
    if (score >= 40) return 'bg-sky-50 text-sky-700';
    return 'bg-slate-100 text-slate-600';
  });

  protected readonly scorePrefix = computed(() => (this.trend().viralScore >= 80 ? '🔥 ' : ''));
}
