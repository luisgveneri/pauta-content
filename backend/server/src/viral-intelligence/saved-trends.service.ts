import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SavedTrendsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string) {
    const saved = await this.prisma.savedTrend.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: { trend: { include: { pattern: true } } },
    });
    return saved.map((s) => s.trend);
  }

  async save(organizationId: string, trendId: string) {
    const trend = await this.prisma.trend.findUnique({
      where: { id: trendId },
    });
    if (!trend) {
      throw new NotFoundException('Trend not found.');
    }
    // Upsert, not create — saving an already-saved trend must stay
    // idempotent rather than throwing a unique-constraint error.
    await this.prisma.savedTrend.upsert({
      where: { organizationId_trendId: { organizationId, trendId } },
      create: { organizationId, trendId },
      update: {},
    });
    return { saved: true };
  }

  async unsave(organizationId: string, trendId: string) {
    // deleteMany (not delete) so unsaving something already unsaved is a
    // no-op rather than a 404 — the caller only cares about the end state.
    await this.prisma.savedTrend.deleteMany({
      where: { organizationId, trendId },
    });
    return { saved: false };
  }
}
