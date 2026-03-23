import { clerkClient } from '@clerk/nextjs/server';
import { notify } from '@/lib/notifications/notify';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { and, eq, gte } from 'drizzle-orm';

// Human-readable labels for each source type
const SOURCE_LABELS: Record<string, string> = {
  hubspot:  'HubSpot',
  stripe:   'Stripe',
  intercom: 'Intercom',
  mixpanel: 'Mixpanel',
};

function getSourceLabel(sourceType: string): string {
  return SOURCE_LABELS[sourceType] ?? sourceType;
}

/**
 * Returns true if a sync_failure notification was already sent for this org
 * within the last 5 minutes — prevents duplicate alerts on Inngest retries.
 * MVP dedup: window-based per org rather than per syncLogId to avoid a
 * schema migration. Acceptable trade-off: two sources failing within 5 minutes
 * in the same org will only fire one alert.
 */
async function alreadyNotified(orgId: string): Promise<boolean> {
  const existing = await db.query.notifications.findFirst({
    where: and(
      eq(notifications.orgId, orgId),
      eq(notifications.type, 'sync_failure'),
      gte(notifications.createdAt, new Date(Date.now() - 5 * 60 * 1000))
    ),
    columns: { id: true },
  });
  return !!existing;
}

export async function notifySyncFailure(params: {
  orgId: string;
  sourceType: string;
  sourceName?: string;
  errorMessage: string;
  syncLogId: string;
}): Promise<void> {
  const { orgId, sourceType, errorMessage, syncLogId } = params;
  const sourceName = params.sourceName ?? getSourceLabel(sourceType);

  // Dedup guard — one notification per 5-minute window per org
  const isDuplicate = await alreadyNotified(orgId);
  if (isDuplicate) return;

  const client = await clerkClient();

  const memberships = await client.organizations.getOrganizationMembershipList({
    organizationId: orgId,
  });

  // Notify each opted-in member in parallel — notify() handles shouldNotify() per user
  await Promise.all(
    memberships.data.map(async (m) => {
      const email = m.publicUserData?.identifier;
      const userId = m.publicUserData?.userId;
      if (!email || !userId) return;

      await notify({
        userId,
        orgId,
        email,
        type: 'sync_failure',
        title: `${sourceName} sync failed`,
        body: `The last sync for ${sourceName} failed with the following error:\n\n${errorMessage}\n\nCheck your connected sources to reconnect with updated credentials.`,
        link: `${process.env.NEXT_PUBLIC_APP_URL}/settings/sources`,
        data: { sourceType, syncLogId },
      });
    })
  );
}
