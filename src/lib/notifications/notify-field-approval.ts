import { clerkClient } from '@clerk/nextjs/server';
import { notify } from '@/lib/notifications/notify';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { and, eq, gte } from 'drizzle-orm';

/**
 * Returns true if a field_approval notification was already sent for this org
 * within the last 5 minutes — prevents duplicate alerts on Inngest retries.
 * Dedup is per-org (not per syncRunId) to avoid schema changes. Acceptable
 * trade-off: two sources syncing within 5 min in the same org fire one alert.
 */
async function alreadyNotified(orgId: string): Promise<boolean> {
  const existing = await db.query.notifications.findFirst({
    where: and(
      eq(notifications.orgId, orgId),
      eq(notifications.type, 'field_approval'),
      gte(notifications.createdAt, new Date(Date.now() - 5 * 60 * 1000))
    ),
    columns: { id: true },
  });
  return !!existing;
}

export async function notifyFieldApprovalNeeded(params: {
  orgId: string;
  sourceType: string;
  sourceName: string;
  fieldCount: number;
  syncRunId: string;
}): Promise<void> {
  const { orgId, sourceName, fieldCount, syncRunId } = params;

  // Guard — don't notify if the sync produced no new proposals
  if (fieldCount === 0) return;

  // Dedup — one notification per org per 5-minute window
  if (await alreadyNotified(orgId)) return;

  const client = await clerkClient();
  const memberships = await client.organizations.getOrganizationMembershipList({
    organizationId: orgId,
  });

  const fieldWord = fieldCount === 1 ? 'field' : 'fields';

  // Notify each opted-in member in parallel — notify() handles shouldNotify() per user
  await Promise.all(
    memberships.data.map(async (m) => {
      const email  = m.publicUserData?.identifier;
      const userId = m.publicUserData?.userId;
      if (!email || !userId) return;

      await notify({
        userId,
        orgId,
        email,
        type:  'field_approval',
        title: `${fieldCount} new ${fieldWord} need your approval (${sourceName})`,
        body:  `A recent ${sourceName} sync proposed ${fieldCount} new ${fieldWord} for your data model. Review and approve them to keep your model up to date.`,
        link:  `${process.env.NEXT_PUBLIC_APP_URL}/fields`,
        data:  { syncRunId, fieldCount, sourceName },
      });
    })
  );
}
