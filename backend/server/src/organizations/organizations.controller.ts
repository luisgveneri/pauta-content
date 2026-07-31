import { Controller, Get } from '@nestjs/common';
import { CurrentAuthContext } from '../auth/current-org.decorator';
import type { AuthContext } from '../auth/auth-context';

@Controller('organizations')
export class OrganizationsController {
  @Get('current')
  getCurrent(@CurrentAuthContext() authContext: AuthContext) {
    return {
      organizationId: authContext.organizationId,
      name: authContext.organizationName,
      type: authContext.organizationType,
      businessRole: authContext.businessRole,
    };
  }
}
