import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { CAMPAIGN_OBJECTIVE_LABELS, CampaignSlotPhase } from './domain/campaign.model';
import { CampaignInsightsStore } from './state/campaign-insights.store';

const PHASE_LABELS: Record<CampaignSlotPhase, string> = {
  PRE: 'Antes',
  DURING: 'Durante',
  POST: 'Después',
};

@Component({
  selector: 'app-campaign-insights-page',
  standalone: true,
  imports: [MatCardModule, MatProgressBarModule, PageHeaderComponent, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './campaign-insights.page.html',
})
export class CampaignInsightsPage implements OnInit {
  protected readonly store = inject(CampaignInsightsStore);
  protected readonly objectiveLabels = CAMPAIGN_OBJECTIVE_LABELS;
  protected readonly phaseLabels = PHASE_LABELS;

  ngOnInit() {
    void this.store.load();
  }
}
