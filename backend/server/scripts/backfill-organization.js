"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const backend_1 = require("@clerk/backend");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
async function main() {
    const clerkOrgId = process.env.BACKFILL_CLERK_ORG_ID;
    if (!clerkOrgId) {
        throw new Error('Set BACKFILL_CLERK_ORG_ID=org_xxx before running this script.');
    }
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
        throw new Error('CLERK_SECRET_KEY no está definido en .env.');
    }
    const clerk = (0, backend_1.createClerkClient)({ secretKey });
    const clerkOrg = await clerk.organizations.getOrganization({ organizationId: clerkOrgId });
    const prisma = new client_1.PrismaClient({
        adapter: new adapter_pg_1.PrismaPg({ connectionString: process.env.DATABASE_URL }),
    });
    try {
        const organization = await prisma.organization.upsert({
            where: { clerkOrgId },
            create: { clerkOrgId, name: clerkOrg.name, type: 'CLUB' },
            update: { name: clerkOrg.name },
        });
        console.log(`Organization local: ${organization.id} ("${organization.name}", clerkOrgId=${clerkOrgId})`);
        const results = await prisma.$transaction([
            prisma.instagramAccount.updateMany({
                where: { organizationId: null },
                data: { organizationId: organization.id },
            }),
            prisma.viralVideo.updateMany({
                where: { organizationId: null },
                data: { organizationId: organization.id },
            }),
            prisma.idea.updateMany({
                where: { organizationId: null },
                data: { organizationId: organization.id },
            }),
            prisma.plannerItem.updateMany({
                where: { organizationId: null },
                data: { organizationId: organization.id },
            }),
        ]);
        console.log(`Backfilled: ${results[0].count} InstagramAccount, ${results[1].count} ViralVideo, ${results[2].count} Idea, ${results[3].count} PlannerItem`);
        const remaining = await prisma.$transaction([
            prisma.instagramAccount.count({ where: { organizationId: null } }),
            prisma.viralVideo.count({ where: { organizationId: null } }),
            prisma.idea.count({ where: { organizationId: null } }),
            prisma.plannerItem.count({ where: { organizationId: null } }),
        ]);
        const totalRemaining = remaining.reduce((a, b) => a + b, 0);
        if (totalRemaining > 0) {
            throw new Error(`Aún quedan ${totalRemaining} filas sin organizationId: ${JSON.stringify(remaining)}`);
        }
        console.log('Verificación OK: 0 filas huérfanas restantes.');
    }
    finally {
        await prisma.$disconnect();
    }
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=backfill-organization.js.map