'use server';

import { db } from '@/lib/db';
import { notificationPreferences } from '@/lib/db/schema';
import { getAuth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import type { NotificationType } from '@/lib/notifications/types';

export async function updateNotificationPreference(
  type: NotificationType,
  enabled: boolean
) {
  const { orgId, userId } = await getAuth();

  await db
    .insert(notificationPreferences)
    .values({
      userId,
      orgId,
      type,
      enabled,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        notificationPreferences.userId,
        notificationPreferences.orgId,
        notificationPreferences.type,
      ],
      set: {
        enabled,
        updatedAt: new Date(),
      },
    });

  revalidatePath('/settings/notifications');
}
