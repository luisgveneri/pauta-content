import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PlaytomicController } from './playtomic.controller';
import { PlaytomicInsightsService } from './playtomic-insights.service';
import { PlaytomicMockService } from './playtomic-mock.service';

@Module({
  imports: [PrismaModule],
  controllers: [PlaytomicController],
  providers: [PlaytomicMockService, PlaytomicInsightsService],
})
export class PlaytomicModule {}
