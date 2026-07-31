import { OrganizationType } from '@prisma/client';

export type BusinessRole = 'manager' | 'reception' | null;

/**
 * Maps a Clerk org role to our own business-role concept. Only meaningful
 * for CLUB organizations (multi-location); CREATOR orgs don't have this
 * concept yet. Until a CLUB org's members are explicitly assigned the
 * custom `org:manager`/`org:reception` roles (future invite flow), they
 * still hold Clerk's default `org:admin`/`org:member` roles — the fallback
 * below maps those sensibly so nobody is "role-less" in the meantime.
 */
export function resolveBusinessRole(orgType: OrganizationType, clerkRole: string): BusinessRole {
  if (orgType !== 'CLUB') return null;
  if (clerkRole === 'org:manager' || clerkRole === 'org:admin') return 'manager';
  if (clerkRole === 'org:reception' || clerkRole === 'org:member') return 'reception';
  return null;
}
