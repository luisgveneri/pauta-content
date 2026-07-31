import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlannerItemDto } from './dto/create-planner-item.dto';

@Injectable()
export class PlannerService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(organizationId: string) {
    return this.prisma.plannerItem.findMany({ where: { organizationId }, orderBy: { date: 'asc' } });
  }

  create(organizationId: string, dto: CreatePlannerItemDto) {
    return this.prisma.plannerItem.create({ data: { ...dto, date: new Date(dto.date), organizationId } });
  }
}
