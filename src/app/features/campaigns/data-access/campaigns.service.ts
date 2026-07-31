import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiClient } from '../../../core/http/api-client.service';
import { apiEndpoints } from '../../../core/http/api-endpoints';
import {
  Campaign,
  CampaignContentSlot,
  CampaignInsights,
  ConfirmSlotDto,
  CreateCampaignDto,
  SetCampaignResultDto,
} from '../domain/campaign.model';

@Injectable({ providedIn: 'root' })
export class CampaignsService {
  private readonly api = inject(ApiClient);

  listCampaigns(): Promise<Campaign[]> {
    return firstValueFrom(this.api.get<Campaign[]>(apiEndpoints.campaigns.list));
  }

  getCampaign(id: string): Promise<Campaign> {
    return firstValueFrom(this.api.get<Campaign>(apiEndpoints.campaigns.detail(id)));
  }

  createCampaign(dto: CreateCampaignDto): Promise<Campaign> {
    return firstValueFrom(this.api.post<Campaign>(apiEndpoints.campaigns.create, dto));
  }

  confirmSlot(campaignId: string, slotId: string, dto: ConfirmSlotDto): Promise<CampaignContentSlot> {
    return firstValueFrom(
      this.api.post<CampaignContentSlot>(apiEndpoints.campaigns.confirmSlot(campaignId, slotId), dto),
    );
  }

  setResult(id: string, dto: SetCampaignResultDto): Promise<Campaign> {
    return firstValueFrom(this.api.put<Campaign>(apiEndpoints.campaigns.result(id), dto));
  }

  getInsights(): Promise<CampaignInsights> {
    return firstValueFrom(this.api.get<CampaignInsights>(apiEndpoints.campaigns.insights));
  }
}
