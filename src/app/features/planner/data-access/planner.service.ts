import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiClient } from '../../../core/http/api-client.service';
import { apiEndpoints } from '../../../core/http/api-endpoints';
import { CreatePlannerItemDto, PlannerItem } from '../domain/planner-item.model';

@Injectable({ providedIn: 'root' })
export class PlannerService {
  private readonly api = inject(ApiClient);

  listItems(): Promise<PlannerItem[]> {
    return firstValueFrom(this.api.get<PlannerItem[]>(apiEndpoints.planner.items));
  }

  createItem(dto: CreatePlannerItemDto): Promise<PlannerItem> {
    return firstValueFrom(this.api.post<PlannerItem>(apiEndpoints.planner.items, dto));
  }
}
