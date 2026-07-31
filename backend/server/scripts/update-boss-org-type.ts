/**
 * One-off: flips the "Boss Organization" (the only org that existed before
 * OrganizationType defaulted to CREATOR) from CLUB to CREATOR, matching the
 * decision to make CREATOR the default vertical going forward.
 *
 * Usage: npx ts-node scripts/update-boss-org-type.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const organization = await prisma.organization.update({
      where: { clerkOrgId: 'org_3HDQCoqTyWmFs9SE3WXu36eBl52' },
      data: { type: 'CREATOR' },
    });
    console.log(`Updated: ${organization.name} -> type=${organization.type}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
