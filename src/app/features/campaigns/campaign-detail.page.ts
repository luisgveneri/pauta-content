import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, inject, OnInit, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute } from '@angular/router';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { Platform } from '../../shared/models/platform.model';
import { CAMPAIGN_OBJECTIVE_LABELS, Campaign, CampaignContentSlot } from './domain/campaign.model';
import { CampaignsStore } from './state/campaigns.store';

const PHASE_LABELS: Record<CampaignContentSlot['phase'], string> = {
  PRE: 'Antes',
  DURING: 'Durante',
  POST: 'Después',
};

@Component({
  selector: 'app-campaign-detail-page',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatProgressBarModule, PageHeaderComponent, DatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './campaign-detail.page.html',
})
export class CampaignDetailPage implements OnInit {
  protected readonly store = inject(CampaignsStore);
  private readonly route = inject(ActivatedRoute);

  protected readonly objectiveLabels = CAMPAIGN_OBJECTIVE_LABELS;
  protected readonly phaseLabels = PHASE_LABELS;

  private readonly resultValueInput = viewChild<ElementRef<HTMLInputElement>>('resultValueInput');
  private readonly resultNotesInput = viewChild<ElementRef<HTMLInputElement>>('resultNotesInput');

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      void this.store.loadOne(id);
    }
  }

  protected confirm(slot: CampaignContentSlot, platform: string) {
    const campaign = this.store.currentCampaign();
    const value = platform.trim();
    if (!campaign || !value) return;
    void this.store.confirmSlot(campaign.id, slot.id, value as Platform);
  }

  // Derived, not fetched — mirrors how slot Pendiente/Confirmado is computed
  // inline from plannerItemId instead of asking the backend for a flag.
  protected eventFinished(campaign: Campaign): boolean {
    return new Date(campaign.eventEndDate).getTime() < Date.now();
  }

  protected saveResult() {
    const campaign = this.store.currentCampaign();
    const rawValue = this.resultValueInput()?.nativeElement.value;
    if (!campaign || !rawValue) return;
    const resultValue = Number(rawValue);
    if (!Number.isFinite(resultValue)) return;
    const resultNotes = this.resultNotesInput()?.nativeElement.value.trim() || undefined;
    void this.store.setResult(campaign.id, { resultValue, resultNotes });
  }
}
