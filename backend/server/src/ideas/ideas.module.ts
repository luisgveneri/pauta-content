import { Module } from '@nestjs/common';
import { IdeasController } from './ideas.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [IdeasController],
})
export class IdeasModule {}