import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async upsertFromClerk(clerkOrgId: string, name: string) {
    const organization = await this.prisma.organization.upsert({
      where: { clerkOrgId },
      create: { clerkOrgId, name },
      update: { name },
    });
    this.logger.log(`Organization sincronizada: ${organization.id} (${name})`);
    return organization;
  }

  async deleteFromClerk(clerkOrgId: string) {
    const result = await this.prisma.organization.deleteMany({ where: { clerkOrgId } });
    this.logger.log(`Organization eliminada por webhook: clerkOrgId=${clerkOrgId} (${result.count} fila(s))`);
    return result;
  }
}
