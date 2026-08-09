import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { formatCompactNumber } from '../../../../shared/format-compact-number';
import { RecommendedTrend } from '../../domain/trend.model';

@Component({
  selector: 'app-recommendation-card',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './recommendation-card.component.html',
})
export class RecommendationCardComponent {
  readonly recommendation = input.required<RecommendedTrend>();
  readonly saved = input(false);
  readonly savePending = input(false);
  readonly toggleSave = output<void>();

  protected readonly viewsLabel = computed(() => formatCompactNumber(this.recommendation().trend.views));

  protected readonly matchClass = computed(() => {
    const score = this.recommendation().matchScore;
    if (score >= 80) return 'bg-emerald-50 text-emerald-700';
    if (score >= 60) return 'bg-sky-50 text-sky-700';
    return 'bg-slate-100 text-slate-600';
  });

  protected onToggleSave(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.toggleSave.emit();
  }
}
