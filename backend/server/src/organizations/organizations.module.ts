import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ClerkWebhookController } from './clerk-webhook.controller';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

@Module({
  imports: [PrismaModule],
  controllers: [ClerkWebhookController, OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
