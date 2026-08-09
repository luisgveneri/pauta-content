import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlannerItemDto } from './dto/create-planner-item.dto';

@Injectable()
export class PlannerService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(organizationId: string) {
    return this.prisma.plannerItem.findMany({
      where: { organizationId },
      orderBy: { date: 'asc' },
      // Surfaces the reverse of the Trend -> Adaptation -> PlannerItem link
      // so items that came from Viral Intelligence can point back to their
      // source trend, not just forward from the trend's own detail page.
      include: { trendAdaptation: { include: { trend: true } } },
    });
  }

  create(organizationId: string, dto: CreatePlannerItemDto) {
    return this.prisma.plannerItem.create({
      data: { ...dto, date: new Date(dto.date), organizationId },
    });
  }
}
