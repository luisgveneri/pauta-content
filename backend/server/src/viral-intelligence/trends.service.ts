import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListTrendsDto } from './dto/list-trends.dto';

@Injectable()
export class TrendsService {
  constructor(private readonly prisma: PrismaService) {}

  list(query: ListTrendsDto) {
    const where: Prisma.TrendWhereInput = {
      ...(query.source ? { source: query.source } : {}),
      ...(query.minScore !== undefined
        ? { viralScore: { gte: query.minScore } }
        : {}),
      ...(query.maxDuration !== undefined
        ? { durationSec: { lte: query.maxDuration } }
        : {}),
      ...(query.format || query.topic
        ? {
            pattern: {
              ...(query.format ? { format: query.format } : {}),
              ...(query.topic ? { topic: query.topic } : {}),
            },
          }
        : {}),
    };

    const orderBy: Prisma.TrendOrderByWithRelationInput =
      query.sort === 'recent'
        ? { publishedAt: 'desc' }
        : query.sort === 'relativePerformance'
          ? { relativePerformance: 'desc' }
          : { viralScore: 'desc' };

    return this.prisma.trend.findMany({
      where,
      orderBy,
      include: { pattern: true },
    });
  }

  async findOne(id: string) {
    const trend = await this.prisma.trend.findUnique({
      where: { id },
      include: { pattern: true },
    });
    if (!trend) {
      throw new NotFoundException('Trend not found.');
    }
    return trend;
  }
}
