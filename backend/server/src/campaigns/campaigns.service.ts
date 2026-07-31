import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CampaignObjective } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { generateSlots, OBJECTIVE_RESULT_UNITS } from './campaign-templates';
import { ConfirmSlotDto } from './dto/confirm-slot.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { SetCampaignResultDto } from './dto/set-campaign-result.dto';

function withUnitLabel<T extends { objective: CampaignObjective }>(campaign: T) {
  return { ...campaign, unitLabel: OBJECTIVE_RESULT_UNITS[campaign.objective] };
}

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string) {
    const campaigns = await this.prisma.campaign.findMany({
      where: { organizationId },
      orderBy: { eventStartDate: 'asc' },
      include: {
        contentSlots: { orderBy: { scheduledDate: 'asc' }, include: { plannerItem: true } },
      },
    });
    return campaigns.map(withUnitLabel);
  }

  async findOne(organizationId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId },
      include: {
        contentSlots: { orderBy: { scheduledDate: 'asc' }, include: { plannerItem: true } },
      },
    });
    if (!campaign) {
      throw new NotFoundException('Campaña no encontrada.');
    }
    return withUnitLabel(campaign);
  }

  async create(organizationId: string, dto: CreateCampaignDto) {
    const eventStartDate = new Date(dto.eventStartDate);
    const eventEndDate = dto.eventEndDate ? new Date(dto.eventEndDate) : eventStartDate;
    const slots = generateSlots(dto.objective, eventStartDate, eventEndDate);

    const campaign = await this.prisma.campaign.create({
      data: {
        organizationId,
        name: dto.name,
        objective: dto.objective,
        eventStartDate,
        eventEndDate,
        contentSlots: { create: slots },
      },
      include: { contentSlots: { orderBy: { scheduledDate: 'asc' } } },
    });
    return withUnitLabel(campaign);
  }

  /**
   * Turns a suggested slot into a real PlannerItem. Idempotent: confirming an
   * already-confirmed slot throws 409 instead of duplicating or no-op-ing.
   * The conditional `updateMany` (plannerItemId: null) acts as an optimistic
   * lock so two near-simultaneous confirms of the same slot can't both win.
   */
  async confirmSlot(organizationId: string, campaignId: string, slotId: string, dto: ConfirmSlotDto) {
    return this.prisma.$transaction(async (tx) => {
      const slot = await tx.campaignContentSlot.findFirst({
        where: { id: slotId, campaignId, campaign: { organizationId } },
      });
      if (!slot) {
        throw new NotFoundException('Slot no encontrado.');
      }
      if (slot.plannerItemId) {
        throw new ConflictException('Este slot ya está confirmado.');
      }

      const plannerItem = await tx.plannerItem.create({
        data: {
          organizationId,
          date: dto.date ? new Date(dto.date) : slot.scheduledDate,
          title: dto.title ?? slot.label,
          platform: dto.platform,
          status: dto.status ?? 'Draft',
        },
      });

      const result = await tx.campaignContentSlot.updateMany({
        where: { id: slotId, plannerItemId: null },
        data: { plannerItemId: plannerItem.id },
      });

      if (result.count === 0) {
        // Lost the race: another request confirmed this slot in the meantime.
        await tx.plannerItem.delete({ where: { id: plannerItem.id } });
        throw new ConflictException('Este slot ya está confirmado.');
      }

      return tx.campaignContentSlot.findUniqueOrThrow({
        where: { id: slotId },
        include: { plannerItem: true },
      });
    });
  }

  /**
   * Upsert: registers or edits the real-world outcome of a campaign. Writing
   * is intentionally permissive (no block on future events — clubs often know
   * the result before the event, e.g. "sold out" a week early). Strictness
   * lives on the read side instead (see CampaignInsightsService, which only
   * counts campaigns whose event has actually finished).
   */
  async setResult(organizationId: string, id: string, dto: SetCampaignResultDto) {
    const campaign = await this.prisma.campaign.findFirst({ where: { id, organizationId } });
    if (!campaign) {
      throw new NotFoundException('Campaña no encontrada.');
    }

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: {
        resultValue: dto.resultValue,
        resultNotes: dto.resultNotes,
        resultRecordedAt: new Date(),
      },
    });

    return withUnitLabel({ ...updated, eventFinished: updated.eventEndDate < new Date() });
  }
}
