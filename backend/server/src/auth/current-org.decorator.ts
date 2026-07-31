import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { OrganizationType } from '@prisma/client';
import { AuthContext, RequestWithAuth } from './auth-context';
import { BusinessRole } from './business-role';

/** Reads the organizationId that ClerkAuthGuard resolved for the current request. */
export const CurrentOrg = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<RequestWithAuth>();
  return request.authContext.organizationId;
});

/** Reads the current organization's vertical (CLUB | CREATOR). */
export const CurrentOrgType = createParamDecorator((_data: unknown, ctx: ExecutionContext): OrganizationType => {
  const request = ctx.switchToHttp().getRequest<RequestWithAuth>();
  return request.authContext.organizationType;
});

/** Reads the resolved business role ('manager' | 'reception' | null) — only meaningful for CLUB orgs. */
export const CurrentBusinessRole = createParamDecorator((_data: unknown, ctx: ExecutionContext): BusinessRole => {
  const request = ctx.switchToHttp().getRequest<RequestWithAuth>();
  return request.authContext.businessRole;
});

/** Reads the whole AuthContext at once — handy for endpoints that need several fields together. */
export const CurrentAuthContext = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthContext => {
  const request = ctx.switchToHttp().getRequest<RequestWithAuth>();
  return request.authContext;
});
