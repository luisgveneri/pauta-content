import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreatePlannerItemDto } from './dto/create-planner-item.dto';
import { PlannerService } from './planner.service';

@Controller('planner')
export class PlannerController {
  constructor(private readonly plannerService: PlannerService) {}

  @Get('items')
  listItems() {
    return this.plannerService.findAll();
  }

  @Post('items')
  createItem(@Body() dto: CreatePlannerItemDto) {
    return this.plannerService.create(dto);
  }
}
