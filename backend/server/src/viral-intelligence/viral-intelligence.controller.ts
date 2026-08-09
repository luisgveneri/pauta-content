import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { OrganizationType } from '@prisma/client';
import { CurrentOrg, CurrentOrgType } from '../auth/current-org.decorator';
import { AdaptationService } from './adaptation.service';
import { ListTrendsDto } from './dto/list-trends.dto';
import { PlanAdaptationDto } from './dto/plan-adaptation.dto';
import { RecommendationService } from './recommendation.service';
import { SavedTrendsService } from './saved-trends.service';
import { TrendDiscoveryService } from './trend-discovery.service';
import { TrendPatternService } from './trend-pattern.service';
import { TrendsService } from './trends.service';

@Controller('viral-intelligence')
export class ViralIntelligenceController {
  constructor(
    private readonly trends: TrendsService,
    private readonly discovery: TrendDiscoveryService,
    private readonly pattern: TrendPatternService,
    private readonly recommendations: RecommendationService,
    private readonly saved: SavedTrendsService,
    private readonly adaptation: AdaptationService,
  ) {}

  @Get('trends')
  listTrends(@Query() query: ListTrendsDto) {
    return this.trends.list(query);
  }

  @Get('trends/:id')
  getTrend(@Param('id') id: string) {
    return this.trends.findOne(id);
  }

  @Post('trends/:id/analyze')
  analyzeTrend(@Param('id') id: string) {
    return this.pattern.analyze(id);
  }

  @Get('recommendations')
  getRecommendations(
    @CurrentOrg() organizationId: string,
    @CurrentOrgType() organizationType: OrganizationType,
  ) {
    return this.recommendations.getRecommendations(
      organizationId,
      organizationType,
    );
  }

  @Get('saved')
  listSaved(@CurrentOrg() organizationId: string) {
    return this.saved.list(organizationId);
  }

  @Post('trends/:id/save')
  saveTrend(@CurrentOrg() organizationId: string, @Param('id') id: string) {
    return this.saved.save(organizationId, id);
  }

  @Delete('trends/:id/save')
  unsaveTrend(@CurrentOrg() organizationId: string, @Param('id') id: string) {
    return this.saved.unsave(organizationId, id);
  }

  @Post('trends/:id/adapt')
  adaptTrend(
    @CurrentOrg() organizationId: string,
    @CurrentOrgType() organizationType: OrganizationType,
    @Param('id') id: string,
  ) {
    return this.adaptation.adapt(organizationId, organizationType, id);
  }

  @Post('adaptations/:id/plan')
  planAdaptation(
    @CurrentOrg() organizationId: string,
    @Param('id') id: string,
    @Body() dto: PlanAdaptationDto,
  ) {
    return this.adaptation.planAdaptation(organizationId, id, dto);
  }

  @Post('mock/seed')
  seedMockData() {
    return this.discovery.seed();
  }

  @Delete('mock/seed')
  clearMockData() {
    return this.discovery.clear();
  }
}
