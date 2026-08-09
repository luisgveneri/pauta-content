import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { CAMPAIGN_OBJECTIVE_LABELS, CampaignObjective } from './domain/campaign.model';
import { CampaignsStore } from './state/campaigns.store';

const OBJECTIVES = Object.keys(CAMPAIGN_OBJECTIVE_LABELS) as CampaignObjective[];

@Component({
  selector: 'app-campaigns-page',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatProgressBarModule,
    PageHeaderComponent,
    DatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './campaigns.page.html',
})
export class CampaignsPage implements OnInit {
  protected readonly store = inject(CampaignsStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');
  private readonly startDateInput = viewChild<ElementRef<HTMLInputElement>>('startDateInput');
  private readonly endDateInput = viewChild<ElementRef<HTMLInputElement>>('endDateInput');

  protected readonly objectives = OBJECTIVES;
  protected readonly objectiveLabels = CAMPAIGN_OBJECTIVE_LABELS;
  protected readonly selectedObjective = signal<CampaignObjective>('TOURNAMENT');

  ngOnInit() {
    const objectiveParam = this.route.snapshot.queryParamMap.get('objective');
    if (objectiveParam && this.objectives.includes(objectiveParam as CampaignObjective)) {
      this.selectedObjective.set(objectiveParam as CampaignObjective);
    }
  }

  protected async create() {
    const name = this.nameInput()?.nativeElement.value?.trim();
    const eventStartDate = this.startDateInput()?.nativeElement.value;
    if (!name || !eventStartDate) return;
    const eventEndDate = this.endDateInput()?.nativeElement.value || undefined;

    const campaign = await this.store.create({
      name,
      objective: this.selectedObjective(),
      eventStartDate,
      eventEndDate,
    });
    if (campaign) {
      void this.router.navigate(['/campaigns', campaign.id]);
    }
  }
}
