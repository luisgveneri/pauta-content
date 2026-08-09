import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTabChangeEvent, MatTabsModule } from '@angular/material/tabs';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { TREND_SOURCE_LABELS, TrendSortOption, TrendSource } from './domain/trend.model';
import { ViralIntelligenceStore } from './state/viral-intelligence.store';
import { RecommendationCardComponent } from './ui/recommendation-card/recommendation-card.component';
import { TrendCardComponent } from './ui/trend-card/trend-card.component';

const SORT_LABELS: Record<TrendSortOption, string> = {
  score: 'Viral score',
  recent: 'Most recent',
  relativePerformance: 'Relative performance',
};

@Component({
  selector: 'app-viral-intelligence-page',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatProgressBarModule,
    MatTabsModule,
    MatIconModule,
    DatePipe,
    PageHeaderComponent,
    TrendCardComponent,
    RecommendationCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './viral-intelligence.page.html',
})
export class ViralIntelligencePage {
  protected readonly store = inject(ViralIntelligenceStore);

  protected readonly sources: TrendSource[] = ['TIKTOK', 'INSTAGRAM', 'YOUTUBE'];
  protected readonly sourceLabels = TREND_SOURCE_LABELS;
  protected readonly sortOptions: TrendSortOption[] = ['score', 'recent', 'relativePerformance'];
  protected readonly sortLabels = SORT_LABELS;

  // Discover's trend list is the one dataset heavy/filtered enough to defer
  // until its tab is actually opened — For You and Saved are cheap, bounded
  // lists loaded eagerly so bookmark state is consistent across tabs from the start.
  private discoverLoaded = false;

  private readonly newAccountInput = viewChild<ElementRef<HTMLInputElement>>('newAccountInput');

  constructor() {
    void this.store.loadRecommendations();
    void this.store.loadSaved();
  }

  protected onTabChange(event: MatTabChangeEvent) {
    if (event.index === 1 && !this.discoverLoaded) {
      this.discoverLoaded = true;
      void this.store.loadTrends();
      void this.store.loadMonitoredAccounts();
    }
  }

  protected addMonitoredAccount() {
    const input = this.newAccountInput()?.nativeElement;
    const username = input?.value.trim();
    if (!username) return;
    void this.store.addMonitoredAccount(username);
    if (input) input.value = '';
  }

  protected setSource(source: TrendSource | 'ALL') {
    void this.store.setFilters({ ...this.store.filters(), source: source === 'ALL' ? undefined : source });
  }

  protected setSort(sort: TrendSortOption) {
    void this.store.setFilters({ ...this.store.filters(), sort });
  }

  protected setMinScore(value: string) {
    const minScore = value === '' ? undefined : Number(value);
    void this.store.setFilters({ ...this.store.filters(), minScore: Number.isFinite(minScore) ? minScore : undefined });
  }
}
