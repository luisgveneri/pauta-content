import { SetMetadata } from '@nestjs/common';
import { OrganizationType } from '@prisma/client';

export const REQUIRED_ORG_TYPES_KEY = 'requiredOrgTypes';

/** Restricts an endpoint to organizations of the given type(s). Pair with OrgTypeGuard. */
export const RequireOrgType = (...types: OrganizationType[]) => SetMetadata(REQUIRED_ORG_TYPES_KEY, types);
