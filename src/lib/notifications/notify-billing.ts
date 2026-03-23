import { notify } from '@/lib/notifications/notify';
import { clerkClient } from '@clerk/nextjs/server';

export type BillingEventType =
  | 'payment_success'
  | 'payment_failed'
  | 'trial_ending'
  | 'subscription_cancelled';

export type BillingNotifyParams = {
  orgId: string;
  eventType: BillingEventType;
  data: {
    amountFormatted?: string;
    cardLast4?: string;
    failureReason?: string;
    daysRemaining?: number;
    effectiveDate?: string;
  };
};

function buildPayload(
  eventType: BillingEventType,
  data: BillingNotifyParams['data']
): { title: string; body: string } {
  switch (eventType) {
    case 'payment_success':
      return {
        title: `Payment confirmed — ${data.amountFormatted}`,
        body: `Your payment of ${data.amountFormatted} was processed successfully${
          data.cardLast4 ? ` using the card ending in ${data.cardLast4}` : ''
        }. Your Datamodel.ai subscription is active.`,
      };

    case 'payment_failed':
      return {
        title: `Payment failed — action required`,
        body: `We were unable to charge ${data.amountFormatted ?? 'your card'}${
          data.failureReason ? `: ${data.failureReason}` : ''
        }. Please update your payment method to keep your workspace active.`,
      };

    case 'trial_ending':
      return {
        title: `Your trial ends in ${data.daysRemaining} day${
          data.daysRemaining === 1 ? '' : 's'
        }`,
        body: `Your free trial is ending soon. Add a payment method to continue using Datamodel.ai without interruption.`,
      };

    case 'subscription_cancelled':
      return {
        title: `Subscription cancelled`,
        body: `Your Datamodel.ai subscription has been cancelled${
          data.effectiveDate ? ` and will end on ${data.effectiveDate}` : ''
        }. You can reactivate at any time from your billing settings.`,
      };
  }
}

function billingLink(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  return `${base}/settings/billing`;
}

export async function notifyBilling(params: BillingNotifyParams): Promise<void> {
  const { orgId, eventType, data } = params;
  const { title, body } = buildPayload(eventType, data);
  const link = billingLink();

  const client = await clerkClient();
  const memberships = await client.organizations.getOrganizationMembershipList({
    organizationId: orgId,
  });

  // Billing notifications go to Admins only — not Members or Viewers
  const admins = memberships.data.filter((m) => m.role === 'org:admin');

  await Promise.all(
    admins.map(async (m) => {
      const email = m.publicUserData?.identifier;
      const userId = m.publicUserData?.userId;
      if (!email || !userId) return;

      await notify({
        userId,
        orgId,
        email,
        type: 'billing',
        title,
        body,
        link,
        data: { eventType, ...data },
      });
    })
  );
}
