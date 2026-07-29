import { DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { DashboardStore } from './state/dashboard.store';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [MatCardModule, DecimalPipe, PageHeaderComponent],
  templateUrl: './dashboard.page.html',
})
export class DashboardPage {
  protected readonly store = inject(DashboardStore);
}

