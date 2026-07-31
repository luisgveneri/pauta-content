import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { OrgContextService } from '../../../core/auth/org-context.service';
import { Platform } from '../../../shared/models/platform.model';
import { CampaignsService } from '../data-access/campaigns.service';
import { Campaign, CreateCampaignDto, SetCampaignResultDto } from '../domain/campaign.model';

type CampaignsState = {
  loading: boolean;
  campaigns: Campaign[];
  creating: boolean;
  createError: string | null;
  detailLoading: boolean;
  currentCampaign: Campaign | null;
  confirmingSlotId: string | null;
  confirmError: string | null;
  erroredSlotId: string | null;
  savingResult: boolean;
  saveResultError: string | null;
};

const INITIAL_STATE: CampaignsState = {
  loading: true,
  campaigns: [],
  creating: false,
  createError: null,
  detailLoading: false,
  currentCampaign: null,
  confirmingSlotId: null,
  confirmError: null,
  erroredSlotId: null,
  savingResult: false,
  saveResultError: null,
};

@Injectable({ providedIn: 'root' })
export class CampaignsStore {
  private readonly campaignsService = inject(CampaignsService);
  private readonly orgContext = inject(OrgContextService);

  private readonly _state = signal<CampaignsState>(INITIAL_STATE);

  readonly loading = computed(() => this._state().loading);
  readonly campaigns = computed(() => this._state().campaigns);
  readonly creating = computed(() => this._state().creating);
  readonly createError = computed(() => this._state().createError);
  readonly detailLoading = computed(() => this._state().detailLoading);
  readonly currentCampaign = computed(() => this._state().currentCampaign);
  readonly confirmingSlotId = computed(() => this._state().confirmingSlotId);
  readonly confirmError = computed(() => this._state().confirmError);
  readonly erroredSlotId = computed(() => this._state().erroredSlotId);
  readonly savingResult = computed(() => this._state().savingResult);
  readonly saveResultError = computed(() => this._state().saveResultError);

  constructor() {
    effect(() => {
      if (this.orgContext.type() === 'CLUB') {
        void this.loadAll();
      } else {
        this._state.set({ ...INITIAL_STATE, loading: false });
      }
    });
  }

  async loadAll() {
    this._state.update((s) => ({ ...s, loading: true }));
    const campaigns = await this.campaignsService.listCampaigns();
    this._state.update((s) => ({ ...s, loading: false, campaigns }));
  }

  async loadOne(id: string) {
    this._state.update((s) => ({ ...s, detailLoading: true, currentCampaign: null }));
    const currentCampaign = await this.campaignsService.getCampaign(id);
    this._state.update((s) => ({ ...s, detailLoading: false, currentCampaign }));
  }

  async create(dto: CreateCampaignDto): Promise<Campaign | null> {
    this._state.update((s) => ({ ...s, creating: true, createError: null }));
    try {
      const campaign = await this.campaignsService.createCampaign(dto);
      this._state.update((s) => ({ ...s, creating: false, campaigns: [...s.campaigns, campaign] }));
      return campaign;
    } catch (error) {
      this._state.update((s) => ({ ...s, creating: false, createError: this.extractError(error) }));
      return null;
    }
  }

  async confirmSlot(campaignId: string, slotId: string, platform: Platform) {
    this._state.update((s) => ({ ...s, confirmingSlotId: slotId, confirmError: null, erroredSlotId: null }));
    try {
      const slot = await this.campaignsService.confirmSlot(campaignId, slotId, { platform });
      this._state.update((s) => ({
        ...s,
        confirmingSlotId: null,
        currentCampaign: s.currentCampaign
          ? {
              ...s.currentCampaign,
              contentSlots: s.currentCampaign.contentSlots.map((cs) => (cs.id === slotId ? slot : cs)),
            }
          : s.currentCampaign,
      }));
    } catch (error) {
      this._state.update((s) => ({
        ...s,
        confirmingSlotId: null,
        confirmError: this.extractError(error),
        erroredSlotId: slotId,
      }));
      // A 409 means our local state is stale — re-fetch the campaign instead of trying to reconcile by hand.
      await this.loadOne(campaignId);
    }
  }

  async setResult(id: string, dto: SetCampaignResultDto) {
    this._state.update((s) => ({ ...s, savingResult: true, saveResultError: null }));
    try {
      const campaign = await this.campaignsService.setResult(id, dto);
      this._state.update((s) => ({ ...s, savingResult: false, currentCampaign: campaign }));
    } catch (error) {
      this._state.update((s) => ({ ...s, savingResult: false, saveResultError: this.extractError(error) }));
    }
  }

  private extractError(error: unknown): string {
    if (error && typeof error === 'object' && 'error' in error) {
      const body = (error as { error?: { message?: string | string[] } }).error;
      if (body?.message) {
        return Array.isArray(body.message) ? body.message.join(' ') : body.message;
      }
    }
    return 'Something went wrong. Please try again.';
  }
}
