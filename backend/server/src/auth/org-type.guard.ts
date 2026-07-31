import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequestWithAuth } from './auth-context';
import { REQUIRED_ORG_TYPES_KEY } from './require-org-type.decorator';

/** Runs after ClerkAuthGuard has attached request.authContext. Enforces @RequireOrgType(). */
@Injectable()
export class OrgTypeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredTypes = this.reflector.getAllAndOverride<string[]>(REQUIRED_ORG_TYPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredTypes || requiredTypes.length === 0) return true;

    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    if (!requiredTypes.includes(request.authContext.organizationType)) {
      throw new ForbiddenException(
        `Esta acción no está disponible para organizaciones de tipo ${request.authContext.organizationType}.`,
      );
    }
    return true;
  }
}
