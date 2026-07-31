import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { verifyToken } from '@clerk/backend';
import { PrismaService } from '../prisma/prisma.service';
import { RequestWithAuth } from './auth-context';
import { resolveBusinessRole } from './business-role';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger(ClerkAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const token = this.extractBearerToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Falta el header Authorization.');
    }

    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      throw new Error('CLERK_SECRET_KEY no está definido.');
    }

    let payload: Awaited<ReturnType<typeof verifyToken>>;
    try {
      payload = await verifyToken(token, { secretKey });
    } catch (error) {
      this.logger.warn(`Token verification failed: ${(error as Error).message}`);
      throw new UnauthorizedException('Token inválido o expirado.');
    }

    if (!payload.org_id) {
      throw new ForbiddenException('No hay ninguna organización activa en la sesión.');
    }

    const organization = await this.prisma.organization.findUnique({
      where: { clerkOrgId: payload.org_id },
    });
    if (!organization) {
      this.logger.warn(`No local Organization found for clerkOrgId=${payload.org_id}`);
      throw new ForbiddenException('Esta organización todavía no está sincronizada.');
    }

    const clerkOrgRole = payload.org_role ?? '';
    request.authContext = {
      clerkUserId: payload.sub,
      clerkOrgRole,
      organizationId: organization.id,
      organizationName: organization.name,
      organizationType: organization.type,
      businessRole: resolveBusinessRole(organization.type, clerkOrgRole),
    };
    return true;
  }

  private extractBearerToken(header?: string): string | null {
    if (!header) return null;
    const [scheme, token] = header.split(' ');
    return scheme === 'Bearer' && token ? token : null;
  }
}
