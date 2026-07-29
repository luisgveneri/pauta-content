import { Injectable } from '@nestjs/common';
import { CreatePlannerItemDto } from './dto/create-planner-item.dto';

@Injectable()
export class PlannerService {
  // TODO: Replace in-memory store with Prisma persistence
  private readonly items: CreatePlannerItemDto[] = [];

  findAll() {
    return this.items;
  }

  create(dto: CreatePlannerItemDto) {
    this.items.push(dto);
    return dto;
  }
}
