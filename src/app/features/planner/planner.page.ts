import { DatePipe } from '@angular/common';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { PlannerStore } from './state/planner.store';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';

@Component({
  selector: 'app-planner-page',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatChipsModule,
    DatePipe,
    PageHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './planner.page.html',
})
export class PlannerPage {
  protected readonly store = inject(PlannerStore);
}
