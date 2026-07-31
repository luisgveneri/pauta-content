import { Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentOrg } from '../auth/current-org.decorator';
import { OrgTypeGuard } from '../auth/org-type.guard';
import { RequireOrgType } from '../auth/require-org-type.decorator';
import { PlaytomicInsightsService } from './playtomic-insights.service';
import { PlaytomicMockService } from './playtomic-mock.service';

@Controller('playtomic')
@UseGuards(OrgTypeGuard)
@RequireOrgType('CLUB')
export class PlaytomicController {
  constructor(
    private readonly mock: PlaytomicMockService,
    private readonly insights: PlaytomicInsightsService,
  ) {}

  @Get('insights')
  getInsights(@CurrentOrg() organizationId: string) {
    return this.insights.getInsights(organizationId);
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
