import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentOrg } from '../auth/current-org.decorator';
import { CreatePlannerItemDto } from './dto/create-planner-item.dto';
import { PlannerService } from './planner.service';

@Controller('planner')
export class PlannerController {
  constructor(private readonly plannerService: PlannerService) {}

  @Get('items')
  listItems(@CurrentOrg() organizationId: string) {
    return this.plannerService.findAll(organizationId);
  }

  @Post('items')
  createItem(
    @CurrentOrg() organizationId: string,
    @Body() dto: CreatePlannerItemDto,
  ) {
    return this.plannerService.create(organizationId, dto);
  }
}
