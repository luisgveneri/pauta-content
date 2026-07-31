import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { CurrentOrg } from '../auth/current-org.decorator';
import { OrgTypeGuard } from '../auth/org-type.guard';
import { RequireOrgType } from '../auth/require-org-type.decorator';
import { CampaignInsightsService } from './campaign-insights.service';
import { CampaignsService } from './campaigns.service';
import { ConfirmSlotDto } from './dto/confirm-slot.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { SetCampaignResultDto } from './dto/set-campaign-result.dto';

@Controller('campaigns')
@UseGuards(OrgTypeGuard)
@RequireOrgType('CLUB')
export class CampaignsController {
  constructor(
    private readonly campaigns: CampaignsService,
    private readonly insights: CampaignInsightsService,
  ) {}

  @Get()
  findAll(@CurrentOrg() organizationId: string) {
    return this.campaigns.findAll(organizationId);
  }

  // Must come before `GET :id` — Nest matches routes in declaration order, and
  // a static path can be shadowed by an earlier `:id` param route.
  @Get('insights')
  getInsights(@CurrentOrg() organizationId: string) {
    return this.insights.getInsights(organizationId);
  }

  @Get(':id')
  findOne(@CurrentOrg() organizationId: string, @Param('id') id: string) {
    return this.campaigns.findOne(organizationId, id);
  }

  @Post()
  create(@CurrentOrg() organizationId: string, @Body() dto: CreateCampaignDto) {
    return this.campaigns.create(organizationId, dto);
  }

  @Post(':campaignId/slots/:slotId/confirm')
  confirmSlot(
    @CurrentOrg() organizationId: string,
    @Param('campaignId') campaignId: string,
    @Param('slotId') slotId: string,
    @Body() dto: ConfirmSlotDto,
  ) {
    return this.campaigns.confirmSlot(organizationId, campaignId, slotId, dto);
  }

  @Put(':id/result')
  setResult(@CurrentOrg() organizationId: string, @Param('id') id: string, @Body() dto: SetCampaignResultDto) {
    return this.campaigns.setResult(organizationId, id, dto);
  }
}
