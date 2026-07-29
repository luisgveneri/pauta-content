import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ContentModule } from './content/content.module';
import { IdeasModule } from './ideas/ideas.module';
import { PlannerModule } from './planner/planner.module';

@Module({
  imports: [ContentModule, IdeasModule, PlannerModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
