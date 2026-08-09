import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { LineChartComponent, LineChartPoint } from '../../shared/ui/line-chart/line-chart.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { PlaytomicStore } from './state/playtomic.store';

@Component({
  selector: 'app-playtomic-page',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatProgressBarModule,
    PageHeaderComponent,
    LineChartComponent,
    RouterLink,
    DatePipe,
    CurrencyPipe,
    DecimalPipe,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './playtomic.page.html',
})
export class PlaytomicPage implements OnInit {
  protected readonly store = inject(PlaytomicStore);

  protected readonly bookingsChart = computed<LineChartPoint[]>(() =>
    (this.store.data()?.bookingsByDay ?? []).map((d) => ({ label: d.date, value: d.count })),
  );

  ngOnInit() {
    void this.store.load();
  }

  protected seedMockData() {
    void this.store.seedMockData();
  }

  protected clearMockData() {
    void this.store.clearMockData();
  }
}
