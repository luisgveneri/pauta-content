import { Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentOrg } from '../auth/current-org.decorator';
import { OrgTypeGuard } from '../auth/org-type.guard';
import { RequireOrgType } from '../auth/require-org-type.decorator';
import { PlaytomicBriefingService } from './playtomic-briefing.service';
import { PlaytomicGapsService } from './playtomic-gaps.service';
import { PlaytomicInsightsService } from './playtomic-insights.service';
import { PlaytomicMockService } from './playtomic-mock.service';

@Controller('playtomic')
@UseGuards(OrgTypeGuard)
@RequireOrgType('CLUB')
export class PlaytomicController {
  constructor(
    private readonly mock: PlaytomicMockService,
    private readonly insights: PlaytomicInsightsService,
    private readonly gaps: PlaytomicGapsService,
    private readonly briefing: PlaytomicBriefingService,
  ) {}

  @Get('insights')
  getInsights(@CurrentOrg() organizationId: string) {
    return this.insights.getInsights(organizationId);
  }

  @Get('gaps')
  getGaps(@CurrentOrg() organizationId: string) {
    return this.gaps.getGaps(organizationId);
  }

  @Get('briefing')
  getBriefing(@CurrentOrg() organizationId: string) {
    return this.briefing.getBriefing(organizationId);
  }

  @Post('mock/seed')
  seedMockData(@CurrentOrg() organizationId: string) {
    return this.mock.seed(organizationId);
  }

  @Delete('mock/seed')
  clearMockData(@CurrentOrg() organizationId: string) {
    return this.mock.clear(organizationId);
  }
}
