import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

function normalizeUsername(username: string): string {
  return username.trim().replace(/^@/, '').toLowerCase();
}

@Injectable()
export class MonitoredAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string) {
    return this.prisma.monitoredInstagramAccount.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async add(organizationId: string, username: string) {
    try {
      return await this.prisma.monitoredInstagramAccount.create({
        data: { organizationId, username: normalizeUsername(username) },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Ya estás monitorizando esta cuenta.');
      }
      throw error;
    }
  }

  async remove(organizationId: string, id: string) {
    const result = await this.prisma.monitoredInstagramAccount.deleteMany({
      where: { id, organizationId },
    });
    if (result.count === 0) {
      throw new NotFoundException('Cuenta monitorizada no encontrada.');
    }
    return { removed: true };
  }

  /** Distinct usernames across every organization — the actual sync only ever needs to call Business Discovery once per real account. */
  async listDistinctUsernames(): Promise<string[]> {
    const rows = await this.prisma.monitoredInstagramAccount.findMany({
      select: { username: true },
      distinct: ['username'],
    });
    return rows.map((r) => r.username);
  }

  async recordSyncResult(username: string, error: string | null) {
    await this.prisma.monitoredInstagramAccount.updateMany({
      where: { username },
      data: { lastSyncedAt: new Date(), lastSyncError: error },
    });
  }
}
