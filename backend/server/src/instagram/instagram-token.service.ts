import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InstagramApiService } from './instagram-api.service';
import { decryptToken, encryptToken } from './token-crypto';

const CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000;
const REFRESH_WITHIN_DAYS = 7;
const BETWEEN_ACCOUNTS_DELAY_MS = 150;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Keeps the connected Instagram token healthy.
 *
 * Note on Instagram/Facebook token lifecycles: a Page access token derived
 * from a long-lived user token (what `InstagramSyncService.connect` stores)
 * does not carry its own expiry while the underlying grant is valid, so
 * `tokenExpiresAt` is normally null and there is nothing to proactively
 * refresh. This service instead periodically verifies the stored token still
 * works and flags `needsReconnect` if Meta reports it invalid (error code
 * 190), so the UI can prompt the user to paste a fresh token. If a token
 * *does* have an expiry (e.g. a raw user token was stored), it attempts a
 * `fb_exchange_token` refresh once it is within 7 days of expiring.
 */
@Injectable()
export class InstagramTokenService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InstagramTokenService.name);
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly api: InstagramApiService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.checkAndRefresh();
    }, CHECK_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** Runs the health/refresh check for every connected account across every organization — this is a background cron with no request context, so there is no single "current org" to scope to. */
  async checkAndRefresh() {
    const accounts = await this.prisma.instagramAccount.findMany();
    for (const account of accounts) {
      await this.checkAccount(account);
      await sleep(BETWEEN_ACCOUNTS_DELAY_MS);
    }
  }

  private async checkAccount(account: { id: string; igUserId: string; username: string; accessTokenEnc: string; tokenExpiresAt: Date | null; needsReconnect: boolean }) {
    const token = decryptToken(account.accessTokenEnc);

    if (account.tokenExpiresAt) {
      const msUntilExpiry = account.tokenExpiresAt.getTime() - Date.now();
      if (msUntilExpiry < REFRESH_WITHIN_DAYS * 24 * 60 * 60 * 1000) {
        try {
          const refreshed = await this.api.exchangeForLongLived(token);
          const tokenExpiresAt = refreshed.expiresInSec
            ? new Date(Date.now() + refreshed.expiresInSec * 1000)
            : null;
          await this.prisma.instagramAccount.update({
            where: { id: account.id },
            data: { accessTokenEnc: encryptToken(refreshed.accessToken), tokenExpiresAt, needsReconnect: false },
          });
          this.logger.log(`Token de Instagram renovado para ${account.username}.`);
          return;
        } catch (error) {
          this.logger.warn(`Fallo al renovar el token: ${(error as Error).message}`);
          await this.prisma.instagramAccount.update({
            where: { id: account.id },
            data: { needsReconnect: true },
          });
          return;
        }
      }
    }

    try {
      await this.api.getAccount(account.igUserId, token);
      if (account.needsReconnect) {
        await this.prisma.instagramAccount.update({ where: { id: account.id }, data: { needsReconnect: false } });
      }
    } catch (error) {
      this.logger.warn(`El token de Instagram parece inválido: ${(error as Error).message}`);
      await this.prisma.instagramAccount.update({ where: { id: account.id }, data: { needsReconnect: true } });
    }
  }
}
