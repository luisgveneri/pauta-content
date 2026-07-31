import { OrganizationType } from '@prisma/client';
import { Request } from 'express';
import { BusinessRole } from './business-role';

export type AuthContext = {
  clerkUserId: string;
  clerkOrgRole: string;
  organizationId: string;
  organizationName: string;
  organizationType: OrganizationType;
  businessRole: BusinessRole;
};

export type RequestWithAuth = Request & { authContext: AuthContext };
