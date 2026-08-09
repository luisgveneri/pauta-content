import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { validateCreativePattern } from './creative-pattern';

@Injectable()
export class TrendPatternService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

  /**
   * 1:1 with Trend and permanently cached — a trend is sent to the LLM at
   * most once. Every other read (Discover filters, For You, the detail
   * page) hits this cached row, never the model again. See the plan's
   * AI-cost-control section.
   */
  async analyze(trendId: string) {
    const trend = await this.prisma.trend.findUnique({
      where: { id: trendId },
      include: { pattern: true },
    });
    if (!trend) {
      throw new NotFoundException('Trend not found.');
    }
    if (trend.pattern) {
      return trend.pattern;
    }

    const { payload, model } = await this.ai.extractCreativePattern({
      title: trend.title,
      caption: trend.caption,
      hashtags: trend.hashtags,
      durationSec: trend.durationSec,
      viralScore: trend.viralScore,
      relativePerformance: trend.relativePerformance,
    });
    const pattern = validateCreativePattern(payload);

    return this.prisma.trendPattern.create({
      data: {
        trendId: trend.id,
        model,
        payload: pattern as unknown as Prisma.InputJsonValue,
        format: pattern.format,
        topic: pattern.topic,
        emotion: pattern.emotion,
        ctaType: pattern.ctaType,
      },
    });
  }
}
