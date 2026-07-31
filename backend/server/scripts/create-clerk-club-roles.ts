/**
 * One-off: creates the two custom Organization Roles used for the CLUB
 * vertical's business-role mapping (see src/auth/business-role.ts). These
 * roles are created once at the Clerk-instance level and become assignable
 * to any organization — our own code is what restricts their meaning to
 * CLUB-type organizations.
 *
 * Safe to re-run: skips creation if a role with the same key already exists.
 *
 * Usage: npx ts-node scripts/create-clerk-club-roles.ts
 */
import 'dotenv/config';
import { createClerkClient } from '@clerk/backend';

const ROLES_TO_CREATE = [
  { key: 'org:manager', name: 'Manager', description: 'Sees all locations / full organization data.' },
  { key: 'org:reception', name: 'Reception', description: 'Sees only their assigned location.' },
];

async function main() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error('CLERK_SECRET_KEY no está definido en .env.');
  }
  const clerk = createClerkClient({ secretKey });

  const { data: existingRoles } = await clerk.organizationRoles.getOrganizationRoleList({ limit: 100 });
  const existingKeys = new Set(existingRoles.map((r) => r.key));

  for (const role of ROLES_TO_CREATE) {
    if (existingKeys.has(role.key)) {
      console.log(`Ya existe: ${role.key}`);
      continue;
    }
    const created = await clerk.organizationRoles.createOrganizationRole({
      key: role.key,
      name: role.name,
      description: role.description,
    });
    console.log(`Creado: ${created.key} (id=${created.id})`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
