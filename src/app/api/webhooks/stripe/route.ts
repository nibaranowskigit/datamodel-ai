import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { notifyBilling } from '@/lib/notifications/notify-billing';

// Webhook signature verification uses `Stripe.webhooks.constructEvent` only — no API key.
// Avoid `new Stripe(process.env.STRIPE_SECRET_KEY)` at module load so `next build` works
// when Stripe secrets are absent (e.g. CI).

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

async function getOrgIdFromStripeCustomer(
  customerId: string
): Promise<string | null> {
  const { db } = await import('@/lib/db');
  const { orgs } = await import('@/lib/db/schema');
  const { eq } = await import('drizzle-orm');

  const org = await db.query.orgs.findFirst({
    where: eq(orgs.stripeCustomerId, customerId),
    columns: { id: true },
  });
  return org?.id ?? null;
}


export async function POST(req: NextRequest) {
  const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'No webhook secret' }, { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Respond to Stripe immediately — all async work happens via notifyBilling
  // which is fire-and-forget from Stripe's perspective
  const handleEvent = async () => {
    switch (event.type) {
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const orgId = await getOrgIdFromStripeCustomer(invoice.customer as string);
        if (!orgId) break;

        await notifyBilling({
          orgId,
          eventType: 'payment_success',
          data: {
            amountFormatted: formatAmount(invoice.amount_paid, invoice.currency),
          },
        });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const orgId = await getOrgIdFromStripeCustomer(invoice.customer as string);
        if (!orgId) break;

        await notifyBilling({
          orgId,
          eventType: 'payment_failed',
          data: {
            amountFormatted: formatAmount(invoice.amount_due, invoice.currency),
            failureReason: invoice.last_finalization_error?.message,
          },
        });
        break;
      }

      case 'customer.subscription.trial_will_end': {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = await getOrgIdFromStripeCustomer(sub.customer as string);
        if (!orgId) break;

        const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000) : null;
        const daysRemaining = trialEnd
          ? Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : 3;

        await notifyBilling({
          orgId,
          eventType: 'trial_ending',
          data: { daysRemaining },
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = await getOrgIdFromStripeCustomer(sub.customer as string);
        if (!orgId) break;

        await notifyBilling({
          orgId,
          eventType: 'subscription_cancelled',
          data: {
            effectiveDate: sub.ended_at
              ? new Date(sub.ended_at * 1000).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
              : undefined,
          },
        });
        break;
      }

      default:
        break;
    }
  };

  // Fire-and-forget — Stripe requires 200 within 30s, notification delivery is best-effort
  handleEvent().catch((err) => {
    console.error('[stripe-webhook] notifyBilling error:', err);
  });

  return NextResponse.json({ received: true });
}
