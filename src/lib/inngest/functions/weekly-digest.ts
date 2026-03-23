import { inngest } from '../client';
import { db } from '@/lib/db';
import { orgs } from '@/lib/db/schema';
import { clerkClient } from '@clerk/nextjs/server';
import { notify } from '@/lib/notifications/notify';
import { buildDigestData } from '@/lib/notifications/digest/build-digest';

export const weeklyDigest = inngest.createFunction(
  {
    id: 'weekly-digest',
    name: 'Weekly Digest',
    concurrency: { limit: 5 },
    triggers: [{ cron: '0 8 * * 0' }],
  },
  async ({ step }) => {
    // Fetch all active orgs — process 5 concurrently via Inngest concurrency limit
    const allOrgs = await step.run('fetch-orgs', async () => {
      return db.query.orgs.findMany({
        columns: { id: true, name: true, clerkOrgId: true },
      });
    });

    // Process each org — each step is independently retried and observable
    for (const org of allOrgs) {
      await step.run(`digest-${org.id}`, async () => {
        const now       = new Date();
        const weekEnd   = new Date(now);
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - 7);

        // Build digest once per org — never re-query per member
        const digest = await buildDigestData(org.id, weekStart, weekEnd);

        // Skip orgs with no activity — no email sent, no in-app record created
        if (!digest.hasActivity) return;

        // Fetch org members via Clerk using the Clerk org ID
        const client = await clerkClient();
        const memberships = await client.organizations
          .getOrganizationMembershipList({ organizationId: org.clerkOrgId });

        const appUrl = process.env.NEXT_PUBLIC_APP_URL;

        // Notify each member in parallel — shouldNotify() in notify() gates on
        // the member's weekly_digest preference (defaults to false per SETTINGS.4)
        await Promise.all(
          memberships.data.map(async (m) => {
            const email  = m.publicUserData?.identifier;
            const userId = m.publicUserData?.userId;
            if (!email || !userId) return;

            await notify({
              userId,
              orgId:  org.id,
              email,
              type:   'weekly_digest',
              title:  `Your weekly digest — ${org.name}`,
              body:   `${digest.syncs.total} syncs, ${digest.fields.approvedThisWeek} fields approved, health score: ${digest.health.currentScore ?? 'N/A'}`,
              link:   `${appUrl}/dashboard`,
              data:   { digest },
            });
          }),
        );
      });
    }

    return { orgsProcessed: allOrgs.length };
  },
);
