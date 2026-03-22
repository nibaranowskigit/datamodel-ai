import { db } from '@/lib/db';
import { notificationPreferences } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import type { NotificationType } from './types';
import { NOTIFICATION_TYPES } from './types';

/**
 * Returns true if the user wants to receive this notification type.
 * Falls back to the type's defaultEnabled when no preference row exists.
 * Call this before every notification send.
 */
export async function shouldNotify(
  userId: string,
  orgId: string,
  type: NotificationType
): Promise<boolean> {
  const pref = await db.query.notificationPreferences.findFirst({
    where: and(
      eq(notificationPreferences.userId, userId),
      eq(notificationPreferences.orgId, orgId),
      eq(notificationPreferences.type, type)
    ),
    columns: { enabled: true },
  });

  if (pref !== undefined) return pref.enabled;

  const config = NOTIFICATION_TYPES.find((n) => n.type === type);
  return config?.defaultEnabled ?? true;
}
