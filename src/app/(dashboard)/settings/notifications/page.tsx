import { orgGuard } from '@/lib/auth';
import { db } from '@/lib/db';
import { notificationPreferences } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';
import { NotificationToggles } from '@/components/settings/notification-toggles';

export default async function NotificationsPage() {
  const { orgId, userId } = await orgGuard();

  const saved = await db.query.notificationPreferences.findMany({
    where: and(
      eq(notificationPreferences.userId, userId),
      eq(notificationPreferences.orgId, orgId)
    ),
  });

  const preferences = NOTIFICATION_TYPES.map((notif) => {
    const existing = saved.find((s) => s.type === notif.type);
    return {
      ...notif,
      enabled: existing?.enabled ?? notif.defaultEnabled,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Notifications</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose which email alerts you receive. Settings apply to your account only.
        </p>
      </div>
      <NotificationToggles preferences={preferences} />
    </div>
  );
}
