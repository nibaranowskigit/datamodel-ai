import Stripe from 'stripe';
import { db } from '@/lib/db';
import { udmRecords } from '@/lib/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import {
  upsertUdmRecord,
  upsertUdmFieldValue,
  recomputeUdmFillRate,
} from '@/lib/records/udm';
import {
  upsertCdmRecord,
  upsertCdmFieldValue,
  recomputeCdmFillRate,
} from '@/lib/records/cdm';
import type {
  Connector,
  ConnectorConfig,
  StripeConfig,
  SyncResult,
} from '../types';
import { STRIPE_UDM_FIELDS, STRIPE_CDM_FIELDS } from './fields';

const API_VERSION = '2026-02-25.clover' as const;
const ACTIVE_STATUSES = new Set(['active', 'trialing']);

// Synthetic external ID for the org-level CDM aggregate record
const CDM_AGGREGATE_EXTERNAL_ID = 'stripe-org-aggregate';

type CustomerSyncData = {
  subscriptionStatus: string;
  mrr: number;
};

export class StripeConnector implements Connector {
  readonly sourceType = 'stripe';
  readonly udmFields  = STRIPE_UDM_FIELDS;
  readonly cdmFields  = STRIPE_CDM_FIELDS;

  async testConnection(config: ConnectorConfig): Promise<{ ok: boolean; error?: string }> {
    const { secretKey } = config as StripeConfig;
    try {
      const client = new Stripe(secretKey, { apiVersion: API_VERSION });
      await client.customers.list({ limit: 1 });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  async sync(input: {
    orgId: string;
    sourceId: string;
    config: ConnectorConfig;
    businessType: 'b2b' | 'b2c';
  }): Promise<SyncResult> {
    const { secretKey } = input.config as StripeConfig;
    const client = new Stripe(secretKey, { apiVersion: API_VERSION });

    let recordsUpserted = 0;
    let fieldsUpdated   = 0;
    const syncData: CustomerSyncData[] = [];
    const errors: string[] = [];

    await client.customers.list({
      expand: ['data.subscriptions'],
      limit: 100,
    }).autoPagingEach(async (customer) => {
      // Deleted customers have no email and cannot be reconciled
      if (customer.deleted) return;

      try {
        const result = await this.syncCustomer(customer as Stripe.Customer, client, input.orgId);
        if (result) {
          recordsUpserted++;
          fieldsUpdated += result.fieldsWritten;
          syncData.push({
            subscriptionStatus: result.subscriptionStatus,
            mrr: result.mrr,
          });
        }
      } catch (err) {
        errors.push(`Customer ${customer.id}: ${(err as Error).message}`);
      }
    });

    // CDM org-level aggregates — B2B only
    if (input.businessType === 'b2b') {
      try {
        const cdmFieldsWritten = await this.writeCDMAggregates(input.orgId, syncData);
        fieldsUpdated += cdmFieldsWritten;
      } catch (err) {
        errors.push(`CDM aggregates: ${(err as Error).message}`);
      }
    }

    if (errors.length > 0) {
      console.warn(`[stripe] sync completed with ${errors.length} error(s):\n${errors.join('\n')}`);
    }

    return { recordsUpserted, fieldsUpdated };
  }

  private async syncCustomer(
    customer: Stripe.Customer,
    client: Stripe,
    orgId: string,
  ): Promise<{ fieldsWritten: number; subscriptionStatus: string; mrr: number } | null> {
    if (!customer.email) return null; // cannot reconcile without email

    const subscriptions = (customer.subscriptions as Stripe.ApiList<Stripe.Subscription> | undefined)?.data ?? [];

    if (subscriptions.length > 1) {
      const activeCount = subscriptions.filter((s) => ACTIVE_STATUSES.has(s.status)).length;
      if (activeCount > 1) {
        console.warn(`[stripe] Customer ${customer.id} has ${activeCount} active subscriptions — using first`);
      }
    }

    const activeSub =
      subscriptions.find((s) => ACTIVE_STATUSES.has(s.status)) ??
      subscriptions[0] ??
      null;

    // Latest paid invoice
    const invoiceList = await client.invoices.list({
      customer: customer.id,
      limit: 1,
      status: 'paid',
    });
    const lastInvoice = invoiceList.data[0] ?? null;

    const mrr = activeSub ? this.computeMRR(activeSub) : 0;
    const subscriptionStatus = activeSub?.status ?? 'cancelled';

    const fields: Record<string, unknown> = {
      FIN_stripe_customer_id:  customer.id,
      FIN_subscription_status: subscriptionStatus,
      FIN_plan_name:           activeSub?.items.data[0]?.price.nickname
                               ?? activeSub?.items.data[0]?.price.id
                               ?? null,
      FIN_mrr:                 mrr,
      FIN_trial_end:           activeSub?.trial_end
                               ? new Date(activeSub.trial_end * 1000).toISOString()
                               : null,
      FIN_subscription_start:  activeSub?.start_date
                               ? new Date(activeSub.start_date * 1000).toISOString()
                               : null,
      FIN_last_invoice_amount: lastInvoice?.amount_paid ?? null,
      FIN_last_invoice_date:   lastInvoice?.created
                               ? new Date(lastInvoice.created * 1000).toISOString()
                               : null,
      FIN_last_invoice_status: lastInvoice?.status ?? null,
      FIN_lifetime_value:      customer.balance !== undefined
                               ? Math.abs(customer.balance)
                               : null,
    };

    // Reconcile: look for existing UDM record by email (from HubSpot or prior sync)
    const existingByEmail = await db.query.udmRecords.findFirst({
      where: and(
        eq(udmRecords.orgId, orgId),
        eq(udmRecords.email, customer.email),
        isNull(udmRecords.aliasOfId),
      ),
    });

    let recordId: string;

    if (existingByEmail) {
      // Merge FIN_ fields into the existing record — never overwrite non-FIN_ fields
      const mergedData = { ...((existingByEmail.data as Record<string, unknown>) ?? {}), ...fields };
      await db
        .update(udmRecords)
        .set({ data: mergedData, updatedAt: new Date() })
        .where(eq(udmRecords.id, existingByEmail.id));
      recordId = existingByEmail.id;
    } else {
      recordId = await upsertUdmRecord({
        orgId,
        externalUserId: customer.id,
        email: customer.email,
        data: fields,
      });
    }

    let fieldsWritten = 0;
    for (const [fieldKey, value] of Object.entries(fields)) {
      if (value === null || value === undefined) continue;
      await upsertUdmFieldValue({
        recordId,
        orgId,
        fieldKey,
        value,
        sourceType: 'stripe',
        confidence: 1.0,
      });
      fieldsWritten++;
    }

    await recomputeUdmFillRate(recordId, orgId);

    return { fieldsWritten, subscriptionStatus, mrr };
  }

  private computeMRR(sub: Stripe.Subscription): number {
    return sub.items.data.reduce((total, item) => {
      const price  = item.price;
      const amount = price.unit_amount ?? 0;
      const qty    = item.quantity ?? 1;

      if (price.recurring?.interval === 'month') {
        return total + amount * qty;
      }
      if (price.recurring?.interval === 'year') {
        return total + Math.round((amount * qty) / 12);
      }
      return total;
    }, 0);
  }

  private async writeCDMAggregates(
    orgId: string,
    syncData: CustomerSyncData[],
  ): Promise<number> {
    const activeRecords = syncData.filter((r) => ACTIVE_STATUSES.has(r.subscriptionStatus));
    const totalMRR      = activeRecords.reduce((sum, r) => sum + r.mrr, 0);
    const activeCount   = activeRecords.length;

    const now           = new Date();
    const startOfMonth  = new Date(now.getFullYear(), now.getMonth(), 1);
    void startOfMonth; // reserved for future churn-date-based calculation

    const churnedThisMonth = syncData.filter(
      (r) => r.subscriptionStatus === 'cancelled'
    ).length;

    const aggregates: Record<string, number> = {
      FIN_total_mrr:           totalMRR,
      FIN_active_subscribers:  activeCount,
      FIN_churned_this_month:  churnedThisMonth,
      FIN_avg_revenue_per_user: activeCount > 0
        ? Math.round(totalMRR / activeCount)
        : 0,
    };

    const recordId = await upsertCdmRecord({
      orgId,
      externalCompanyId: CDM_AGGREGATE_EXTERNAL_ID,
      name: 'Stripe — Org Aggregates',
      data: aggregates,
    });

    let fieldsWritten = 0;
    for (const [fieldKey, value] of Object.entries(aggregates)) {
      await upsertCdmFieldValue({
        recordId,
        orgId,
        fieldKey,
        value,
        sourceType: 'stripe',
        confidence: 1.0,
      });
      fieldsWritten++;
    }

    await recomputeCdmFillRate(recordId, orgId);

    return fieldsWritten;
  }
}

export const stripeConnector = new StripeConnector();
