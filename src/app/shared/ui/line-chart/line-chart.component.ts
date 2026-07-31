import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type LineChartPoint = { label: string; value: number };

const WIDTH = 600;
const HEIGHT = 160;
const PADDING = 8;

@Component({
  selector: 'app-line-chart',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './line-chart.component.html',
})
export class LineChartComponent {
  points = input<LineChartPoint[]>([]);
  color = input<string>('#0284c7');

  protected readonly viewBox = `0 0 ${WIDTH} ${HEIGHT}`;

  protected readonly polylinePoints = computed(() => {
    const values = this.points().map((p) => p.value);
    if (values.length === 0) return '';
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const step = values.length > 1 ? (WIDTH - PADDING * 2) / (values.length - 1) : 0;

    return values
      .map((value, i) => {
        const x = PADDING + i * step;
        const y = HEIGHT - PADDING - ((value - min) / range) * (HEIGHT - PADDING * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  });

  protected readonly first = computed(() => this.points().at(0));
  protected readonly last = computed(() => this.points().at(-1));
  protected readonly max = computed(() => Math.max(...this.points().map((p) => p.value), 0));
  protected readonly min = computed(() => Math.min(...this.points().map((p) => p.value), 0));
}
