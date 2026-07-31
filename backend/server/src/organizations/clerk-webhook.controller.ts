import { BadRequestException, Controller, Logger, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { verifyWebhook } from '@clerk/backend/webhooks';
import type { Request as ExpressRequest } from 'express';
import { Public } from '../auth/public.decorator';
import { OrganizationsService } from './organizations.service';

@Controller('webhooks/clerk')
export class ClerkWebhookController {
  private readonly logger = new Logger(ClerkWebhookController.name);

  constructor(private readonly organizations: OrganizationsService) {}

  @Public()
  @Post()
  async handle(@Req() req: RawBodyRequest<ExpressRequest>) {
    if (!req.rawBody) {
      throw new BadRequestException('Falta el raw body para verificar la firma del webhook.');
    }

    // verifyWebhook expects a Fetch API Request, not the Express one Nest gives us.
    const webRequest = new Request(`https://internal.webhook${req.originalUrl}`, {
      method: req.method,
      headers: new Headers(req.headers as Record<string, string>),
      body: new Uint8Array(req.rawBody),
    });

    let event: Awaited<ReturnType<typeof verifyWebhook>>;
    try {
      event = await verifyWebhook(webRequest, { signingSecret: process.env.CLERK_WEBHOOK_SECRET });
    } catch (error) {
      this.logger.warn(`Firma de webhook inválida o no verificable: ${(error as Error).message}`);
      throw new BadRequestException('No se pudo verificar la firma del webhook.');
    }

    switch (event.type) {
      case 'organization.created':
      case 'organization.updated':
        await this.organizations.upsertFromClerk(event.data.id, event.data.name);
        break;
      case 'organization.deleted':
        if (event.data.id) {
          await this.organizations.deleteFromClerk(event.data.id);
        }
        break;
      default:
        this.logger.debug(`Evento de Clerk ignorado: ${event.type}`);
    }

    return { received: true };
  }
}
