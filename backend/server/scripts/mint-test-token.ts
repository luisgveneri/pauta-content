/**
 * Dev-only helper: mints a fresh session Bearer token server-side via the
 * Clerk Backend SDK, for the currently active session of a given
 * organization — no browser, no manual copy/paste, no ~60s race.
 *
 * Requires the user to already be signed in with that org active in some
 * real browser tab (we find their live session, we don't create one).
 *
 * Usage: npx ts-node scripts/mint-test-token.ts <clerkOrgId> [expiresInSeconds]
 */
import 'dotenv/config';
import { createClerkClient } from '@clerk/backend';

async function main() {
  const [, , clerkOrgId, expiresArg] = process.argv;
  if (!clerkOrgId) {
    console.error('Usage: npx ts-node scripts/mint-test-token.ts <clerkOrgId> [expiresInSeconds]');
    process.exit(1);
  }
  const expiresInSeconds = expiresArg ? Number(expiresArg) : 300;

  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

  // getSessionList requires clientId or userId — there's no direct "by org"
  // filter, so we go via the org's members first.
  const { data: memberships } = await clerk.organizations.getOrganizationMembershipList({
    organizationId: clerkOrgId,
  });

  let session: Awaited<ReturnType<typeof clerk.sessions.getSessionList>>['data'][number] | null = null;
  for (const membership of memberships) {
    const userId = membership.publicUserData?.userId;
    if (!userId) continue;
    const { data: sessions } = await clerk.sessions.getSessionList({ userId, status: 'active' });
    session = sessions.find((s) => s.lastActiveOrganizationId === clerkOrgId) ?? null;
    if (session) break;
  }

  if (!session) {
    console.error(
      `No active session found with org ${clerkOrgId} as the last active organization. ` +
        `Make sure that org is selected in a real signed-in browser tab.`,
    );
    process.exit(1);
  }

  const token = await clerk.sessions.getToken(session.id, undefined, expiresInSeconds);
  console.log(token.jwt);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
