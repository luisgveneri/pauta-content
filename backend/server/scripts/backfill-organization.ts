/**
 * One-off: creates (or updates the name of) the local Organization mirror
 * row for a real Clerk org, fetching its name from the Clerk Backend API.
 * Originally this also backfilled orphaned rows onto the org (needed once,
 * during the initial multi-tenancy migration, back when organizationId was
 * still nullable) — that step was removed since organizationId is now
 * required everywhere, so no orphans can exist anymore.
 *
 * New orgs default to type=CREATOR (the schema default); pass
 * BACKFILL_ORG_TYPE=CLUB to create it as CLUB instead.
 *
 * Usage:
 *   BACKFILL_CLERK_ORG_ID=org_xxx [BACKFILL_ORG_TYPE=CLUB] npx ts-node scripts/backfill-organization.ts
 */
import 'dotenv/config';
import { createClerkClient } from '@clerk/backend';
import { OrganizationType, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

async function main() {
  const clerkOrgId = process.env.BACKFILL_CLERK_ORG_ID;
  if (!clerkOrgId) {
    throw new Error('Set BACKFILL_CLERK_ORG_ID=org_xxx before running this script.');
  }
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error('CLERK_SECRET_KEY no está definido en .env.');
  }
  const type = (process.env.BACKFILL_ORG_TYPE as OrganizationType | undefined) ?? 'CREATOR';

  const clerk = createClerkClient({ secretKey });
  const clerkOrg = await clerk.organizations.getOrganization({ organizationId: clerkOrgId });

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const organization = await prisma.organization.upsert({
      where: { clerkOrgId },
      create: { clerkOrgId, name: clerkOrg.name, type },
      update: { name: clerkOrg.name },
    });
    console.log(
      `Organization local: ${organization.id} ("${organization.name}", type=${organization.type}, clerkOrgId=${clerkOrgId})`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
