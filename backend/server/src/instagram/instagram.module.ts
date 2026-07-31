import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { PrismaModule } from '../prisma/prisma.module';
import { InstagramAnalysisService } from './instagram-analysis.service';
import { InstagramApiService } from './instagram-api.service';
import { InstagramController } from './instagram.controller';
import { InstagramSyncService } from './instagram-sync.service';
import { InstagramTokenService } from './instagram-token.service';
import { PerformanceService } from './performance.service';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [InstagramController],
  providers: [
    InstagramApiService,
    InstagramSyncService,
    InstagramTokenService,
    PerformanceService,
    InstagramAnalysisService,
  ],
})
export class InstagramModule {}
