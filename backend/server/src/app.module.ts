import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { ContentModule } from './content/content.module';
import { IdeasModule } from './ideas/ideas.module';
import { InstagramModule } from './instagram/instagram.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { PlannerModule } from './planner/planner.module';

@Module({
  imports: [
    AuthModule,
    OrganizationsModule,
    ContentModule,
    IdeasModule,
    PlannerModule,
    InstagramModule,
    CampaignsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
