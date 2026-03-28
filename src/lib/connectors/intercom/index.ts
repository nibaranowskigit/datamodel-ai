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
import { fetchWithRetry } from '../fetch-with-retry';
import type {
  Connector,
  ConnectorConfig,
  IntercomConfig,
  SyncResult,
} from '../types';
import { INTERCOM_UDM_FIELDS, INTERCOM_CDM_FIELDS } from './fields';

const INTERCOM_API = 'https://api.intercom.io';
const INTERCOM_VERSION = '2.11';
const PAGE_SIZE = 150;

// Synthetic external ID for the org-level CDM aggregate record
const CDM_AGGREGATE_EXTERNAL_ID = 'intercom-org-aggregate';

// CSAT rating → numeric value mapping
const CSAT_SCORE: Record<string, number> = {
  amazing:  5,
  great:    4,
  good:     3,
  bad:      2,
  terrible: 1,
};

const POSITIVE_RATINGS = new Set(['amazing', 'great', 'good']);

type IntercomContact = {
  id: string;
  email?: string | null;
};

type IntercomConversation = {
  id: string;
  state: string;
  created_at: number;
  updated_at: number;
  conversation_rating?: {
    rating?: string;
  };
};

type ContactSyncData = {
  openTickets: number;
  csatRating: string | null;
  csatScore: number | null;
  csatResponses: number;
};

export class IntercomConnector implements Connector {
  readonly sourceType = 'intercom';
  readonly udmFields  = INTERCOM_UDM_FIELDS;
  readonly cdmFields  = INTERCOM_CDM_FIELDS;

  async testConnection(config: ConnectorConfig): Promise<{ ok: boolean; error?: string }> {
    const { accessToken } = config as IntercomConfig;
    try {
      const res = await fetchWithRetry(`${INTERCOM_API}/me`, {
        headers: this.headers(accessToken),
      });
      if (res.ok) return { ok: true };
      return { ok: false, error: `Intercom returned ${res.status}` };
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
    const { accessToken } = input.config as IntercomConfig;
    let recordsUpserted = 0;
    let fieldsUpdated   = 0;
    const contactSyncData: ContactSyncData[] = [];
    const errors: string[] = [];

    // ─── Paginate through all contacts ───────────────────────
    let startingAfter: string | undefined;

    do {
      const url = new URL(`${INTERCOM_API}/contacts`);
      url.searchParams.set('per_page', String(PAGE_SIZE));
      if (startingAfter) url.searchParams.set('starting_after', startingAfter);

      const res = await fetchWithRetry(url.toString(), {
        headers: this.headers(accessToken),
      });

      if (!res.ok) throw new Error(`Intercom contacts API error: ${res.status}`);

      const page = await res.json() as {
        data: IntercomContact[];
        pages?: { next?: { starting_after: string } };
      };

      for (const contact of page.data) {
        if (!contact.email) {
          console.warn(`[intercom] Contact ${contact.id} has no email — skipped`);
          continue;
        }

        try {
          const result = await this.syncContact(contact, accessToken, input.orgId);
          if (result) {
            recordsUpserted++;
            fieldsUpdated += result.fieldsWritten;
            contactSyncData.push(result.syncData);
          }
        } catch (err) {
          errors.push(`Contact ${contact.id}: ${(err as Error).message}`);
        }
      }

      startingAfter = page.pages?.next?.starting_after;
    } while (startingAfter);

    // ─── CDM aggregates ──────────────────────────────────────
    try {
      const cdmFieldsWritten = await this.writeCDMAggregates(input.orgId, contactSyncData);
      fieldsUpdated += cdmFieldsWritten;
    } catch (err) {
      errors.push(`CDM aggregates: ${(err as Error).message}`);
    }

    if (errors.length > 0) {
      console.warn(`[intercom] sync completed with ${errors.length} error(s):\n${errors.join('\n')}`);
    }

    return { recordsUpserted, fieldsUpdated };
  }

  private async syncContact(
    contact: IntercomContact,
    accessToken: string,
    orgId: string,
  ): Promise<{ fieldsWritten: number; syncData: ContactSyncData } | null> {
    if (!contact.email) return null;

    // Fetch conversations for this contact (MVP: first page only — Intercom caps at 500)
    const convRes = await fetchWithRetry(
      `${INTERCOM_API}/contacts/${contact.id}/conversations`,
      { headers: this.headers(accessToken) },
    );

    const conversations: IntercomConversation[] =
      convRes.ok
        ? ((await convRes.json() as { conversations?: IntercomConversation[] }).conversations ?? [])
        : [];

    // Ticket counts
    const openTickets = conversations.filter((c) => c.state === 'open').length;

    const cutoff90d   = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const closedLast90d = conversations.filter(
      (c) => c.state === 'closed' && c.updated_at * 1000 >= cutoff90d,
    ).length;

    // CSAT — exclude unknown ratings from the average
    const csatRatings = conversations
      .map((c) => c.conversation_rating?.rating)
      .filter((r): r is string => !!r && r in CSAT_SCORE);

    const csatScores = csatRatings.map((r) => CSAT_SCORE[r]);
    const avgCsat = csatScores.length > 0
      ? Math.round(
          (csatScores.reduce((a, b) => a + b, 0) / csatScores.length) * 10,
        ) / 10
      : null;

    if (csatRatings.length !== conversations.filter((c) => c.conversation_rating?.rating).length) {
      const unknownRatings = conversations
        .map((c) => c.conversation_rating?.rating)
        .filter((r): r is string => !!r && !(r in CSAT_SCORE));
      if (unknownRatings.length > 0) {
        console.warn(`[intercom] Contact ${contact.id}: unknown CSAT rating(s): ${unknownRatings.join(', ')}`);
      }
    }

    const lastRating = csatRatings.length > 0 ? csatRatings[csatRatings.length - 1] : null;

    // Dates
    const sortedDesc = [...conversations].sort((a, b) => b.updated_at - a.updated_at);
    const sortedAsc  = [...conversations].sort((a, b) => a.created_at - b.created_at);

    const lastContactDate  = sortedDesc[0]?.updated_at
      ? new Date(sortedDesc[0].updated_at * 1000).toISOString()
      : null;
    const firstContactDate = sortedAsc[0]?.created_at
      ? new Date(sortedAsc[0].created_at * 1000).toISOString()
      : null;

    const fields: Record<string, unknown> = {
      SUP_intercom_contact_id: contact.id,
      SUP_open_tickets:        openTickets,
      SUP_closed_tickets:      closedLast90d,
      SUP_csat_score:          avgCsat,
      SUP_csat_responses:      csatRatings.length,
      SUP_last_csat_rating:    lastRating,
      SUP_last_contact_date:   lastContactDate,
      SUP_first_contact_date:  firstContactDate,
      SUP_total_conversations: conversations.length,
    };

    // Reconcile: look for existing UDM record by email (from HubSpot or Stripe)
    const existingByEmail = await db.query.udmRecords.findFirst({
      where: and(
        eq(udmRecords.orgId, orgId),
        eq(udmRecords.email, contact.email),
        isNull(udmRecords.aliasOfId),
      ),
    });

    let recordId: string;

    if (existingByEmail) {
      // Merge SUP_ fields into existing record — never overwrite HS_/FIN_ fields
      const mergedData = {
        ...((existingByEmail.data as Record<string, unknown>) ?? {}),
        ...fields,
      };
      await db
        .update(udmRecords)
        .set({ data: mergedData, updatedAt: new Date() })
        .where(eq(udmRecords.id, existingByEmail.id));
      recordId = existingByEmail.id;
    } else {
      recordId = await upsertUdmRecord({
        orgId,
        externalUserId: contact.id,
        email: contact.email,
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
        sourceType: 'intercom',
        confidence: 1.0,
      });
      fieldsWritten++;
    }

    await recomputeUdmFillRate(recordId, orgId);

    return {
      fieldsWritten,
      syncData: {
        openTickets,
        csatRating: lastRating,
        csatScore:  avgCsat,
        csatResponses: csatRatings.length,
      },
    };
  }

  private async writeCDMAggregates(
    orgId: string,
    syncData: ContactSyncData[],
  ): Promise<number> {
    const withCsat = syncData.filter((d) => d.csatResponses > 0 && d.csatScore !== null);
    const avgCsat  = withCsat.length > 0
      ? Math.round(
          withCsat.reduce((sum, d) => sum + (d.csatScore ?? 0), 0) / withCsat.length * 10,
        ) / 10
      : null;

    const totalOpenTickets    = syncData.reduce((sum, d) => sum + d.openTickets, 0);
    const contactsWithOpen    = syncData.filter((d) => d.openTickets > 0).length;

    const allRatings          = syncData.map((d) => d.csatRating).filter((r): r is string => !!r);
    const positiveCount       = allRatings.filter((r) => POSITIVE_RATINGS.has(r)).length;
    const pctPositive         = allRatings.length > 0
      ? Math.round((positiveCount / allRatings.length) * 100)
      : null;

    const aggregates: Record<string, number | null> = {
      SUP_avg_csat:                   avgCsat,
      SUP_total_open_tickets:         totalOpenTickets,
      SUP_contacts_with_open_tickets: contactsWithOpen,
      SUP_pct_rated_positively:       pctPositive,
    };

    const recordId = await upsertCdmRecord({
      orgId,
      externalCompanyId: CDM_AGGREGATE_EXTERNAL_ID,
      name: 'Intercom — Org Aggregates',
      data: aggregates,
    });

    let fieldsWritten = 0;
    for (const [fieldKey, value] of Object.entries(aggregates)) {
      if (value === null) continue;
      await upsertCdmFieldValue({
        recordId,
        orgId,
        fieldKey,
        value,
        sourceType: 'intercom',
        confidence: 1.0,
      });
      fieldsWritten++;
    }

    await recomputeCdmFillRate(recordId, orgId);

    return fieldsWritten;
  }

  private headers(accessToken: string): Record<string, string> {
    return {
      Authorization:      `Bearer ${accessToken}`,
      Accept:             'application/json',
      'Intercom-Version': INTERCOM_VERSION,
    };
  }
}

export const intercomConnector = new IntercomConnector();
