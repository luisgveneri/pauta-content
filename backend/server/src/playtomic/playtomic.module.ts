import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PlaytomicController } from './playtomic.controller';
import { PlaytomicBriefingService } from './playtomic-briefing.service';
import { PlaytomicGapsService } from './playtomic-gaps.service';
import { PlaytomicInsightsService } from './playtomic-insights.service';
import { PlaytomicMockService } from './playtomic-mock.service';

@Module({
  imports: [PrismaModule],
  controllers: [PlaytomicController],
  providers: [PlaytomicMockService, PlaytomicInsightsService, PlaytomicGapsService, PlaytomicBriefingService],
})
export class PlaytomicModule {}
