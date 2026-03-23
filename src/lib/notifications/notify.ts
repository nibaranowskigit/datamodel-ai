import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { resend } from '@/lib/resend';
import { shouldNotify } from '@/lib/notifications/should-notify';
import type { NotificationType } from '@/lib/notifications/types';
import { getEmailTemplate } from '@/lib/notifications/templates';

export type NotifyPayload = {
  userId: string;
  orgId: string;
  email: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  data?: Record<string, unknown>;
};

/**
 * Single entry point for all notifications.
 * Called from Inngest functions only — never from server actions directly.
 * Order: preference check → email send → DB insert (both or neither on failure).
 */
export async function notify(payload: NotifyPayload): Promise<void> {
  const { userId, orgId, email, type, title, body, link, data } = payload;

  const allowed = await shouldNotify(userId, orgId, type);
  if (!allowed) return;

  const template = getEmailTemplate(type, { title, body, link, data });

  const from = process.env.RESEND_FROM_ADDRESS ?? 'Datamodel.ai <onboarding@resend.dev>';
  await resend.emails.send({
    from,
    to: email,
    subject: title,
    react: template,
  });

  await db.insert(notifications).values({
    orgId,
    userId,
    type,
    title,
    body,
    link: link ?? null,
  });
}
