import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { ContentStore } from './state/content.store';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';

@Component({
  selector: 'app-content-page',
  standalone: true,
  imports: [MatCardModule, MatTableModule, MatProgressBarModule, DecimalPipe, DatePipe, PageHeaderComponent],
  templateUrl: './content.page.html',
})
export class ContentPage {
  protected readonly store = inject(ContentStore);
  protected readonly displayedColumns = [
    'title',
    'platform',
    'views',
    'likes',
    'duration',
    'createdAt',
  ] as const;
}

