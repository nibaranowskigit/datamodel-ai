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
  MixpanelConfig,
  SyncResult,
} from '../types';
import { MIXPANEL_UDM_FIELDS, MIXPANEL_CDM_FIELDS } from './fields';

const ENGAGE_API = 'https://mixpanel.com/api/2.0/engage';
const PAGE_SIZE  = 1000;

// Synthetic external ID for the org-level CDM aggregate record
const CDM_AGGREGATE_EXTERNAL_ID = 'mixpanel-org-aggregate';

type ProfileSyncData = {
  lastSeen:      Date | null;
  activated:     boolean | null;
  sessionCount:  number | null;
};

export class MixpanelConnector implements Connector {
  readonly sourceType = 'mixpanel';
  readonly udmFields  = MIXPANEL_UDM_FIELDS;
  readonly cdmFields  = MIXPANEL_CDM_FIELDS;

  async testConnection(config: ConnectorConfig): Promise<{ ok: boolean; error?: string }> {
    const { projectToken, serviceAccountUsername, serviceAccountSecret } =
      config as MixpanelConfig;
    try {
      const params = new URLSearchParams({
        project_token: projectToken,
        page_size:     '1',
        page:          '0',
      });
      const res = await fetchWithRetry(`${ENGAGE_API}?${params}`, {
        headers: this.authHeaders(serviceAccountUsername, serviceAccountSecret),
      });
      if (res.ok) return { ok: true };
      return { ok: false, error: `Mixpanel returned ${res.status}` };
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
    const { projectToken, serviceAccountUsername, serviceAccountSecret, activationEvent } =
      input.config as MixpanelConfig;

    let recordsUpserted = 0;
    let fieldsUpdated   = 0;
    const profileSyncData: ProfileSyncData[] = [];
    const errors: string[] = [];

    // ─── Paginate through People profiles ───────────────────
    let page      = 0;
    let sessionId: string | undefined;
    let total:     number | undefined;

    do {
      const params = new URLSearchParams({
        project_token: projectToken,
        page_size:     String(PAGE_SIZE),
        page:          String(page),
        ...(sessionId ? { session_id: sessionId } : {}),
      });

      const res = await fetchWithRetry(`${ENGAGE_API}?${params}`, {
        headers: this.authHeaders(serviceAccountUsername, serviceAccountSecret),
      });

      if (!res.ok) throw new Error(`Mixpanel engage API error: ${res.status}`);

      const pageData = await res.json() as {
        results:    MixpanelProfile[];
        total:      number;
        session_id: string;
        page:       number;
      };

      // Capture session_id from first page — required for subsequent pages
      if (!sessionId) sessionId = pageData.session_id;
      total = pageData.total;

      for (const profile of pageData.results) {
        try {
          const result = await this.syncProfile(
            profile,
            activationEvent,
            input.orgId,
          );
          if (result) {
            recordsUpserted++;
            fieldsUpdated += result.fieldsWritten;
            profileSyncData.push(result.syncData);
          }
        } catch (err) {
          errors.push(`Profile ${profile.$distinct_id}: ${(err as Error).message}`);
        }
      }

      page++;
    } while (total !== undefined && page * PAGE_SIZE < total);

    // ─── CDM aggregates ──────────────────────────────────────
    try {
      const cdmFieldsWritten = await this.writeCDMAggregates(
        input.orgId,
        profileSyncData,
      );
      fieldsUpdated += cdmFieldsWritten;
    } catch (err) {
      errors.push(`CDM aggregates: ${(err as Error).message}`);
    }

    if (errors.length > 0) {
      console.warn(
        `[mixpanel] sync completed with ${errors.length} error(s):\n${errors.join('\n')}`,
      );
    }

    return { recordsUpserted, fieldsUpdated };
  }

  private async syncProfile(
    profile: MixpanelProfile,
    activationEvent: string | undefined,
    orgId: string,
  ): Promise<{ fieldsWritten: number; syncData: ProfileSyncData } | null> {
    const props = profile.$properties ?? {};
    const email = props.$email as string | undefined;

    if (!email) {
      console.warn(`[mixpanel] Profile ${profile.$distinct_id} has no $email — skipped`);
      return null;
    }

    const lastSeen  = props.$last_seen ? new Date(props.$last_seen as string) : null;
    const firstSeen = props.$created   ? new Date(props.$created as string)   : null;

    const daysSinceLastSeen = lastSeen
      ? Math.floor((Date.now() - lastSeen.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Activation — check computed People properties written by Mixpanel event tracking.
    // activationEvent = null means "not configured" → PROD_activated = null, not false.
    let activated: boolean | null     = null;
    let activationDate: string | null = null;

    if (activationEvent) {
      const firstTimeProp = props[`First Time ${activationEvent}`] as string | undefined;
      const activationDateProp = (props.activation_date ?? props.activated) as string | boolean | undefined;

      activated = !!(firstTimeProp || activationDateProp);
      activationDate = firstTimeProp
        ? new Date(firstTimeProp).toISOString()
        : typeof activationDateProp === 'string'
          ? new Date(activationDateProp).toISOString()
          : null;
    }

    const fields: Record<string, unknown> = {
      PROD_mixpanel_distinct_id: profile.$distinct_id,
      PROD_last_seen:            lastSeen?.toISOString() ?? null,
      PROD_first_seen:           firstSeen?.toISOString() ?? null,
      PROD_days_since_last_seen: daysSinceLastSeen,
      PROD_session_count_30d:    (props.$sessions ?? props.sessions_30d) as number | undefined ?? null,
      PROD_activated:            activated,
      PROD_activation_date:      activationDate,
      PROD_feature_breadth:      (props.feature_breadth_30d as number | undefined) ?? null,
      PROD_country:              (props.$country_code ?? props.$region) as string | undefined ?? null,
    };

    // Reconcile: merge into existing UDM record by email — never overwrite HS_/FIN_/SUP_ fields
    const existingByEmail = await db.query.udmRecords.findFirst({
      where: and(
        eq(udmRecords.orgId, orgId),
        eq(udmRecords.email, email),
        isNull(udmRecords.aliasOfId),
      ),
    });

    let recordId: string;

    if (existingByEmail) {
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
        externalUserId: profile.$distinct_id,
        email,
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
        sourceType: 'mixpanel',
        confidence: 1.0,
      });
      fieldsWritten++;
    }

    await recomputeUdmFillRate(recordId, orgId);

    return {
      fieldsWritten,
      syncData: {
        lastSeen,
        activated,
        sessionCount: (props.$sessions ?? props.sessions_30d) as number | null ?? null,
      },
    };
  }

  private async writeCDMAggregates(
    orgId: string,
    profileData: ProfileSyncData[],
  ): Promise<number> {
    const now = Date.now();
    const d30 = 30 * 24 * 60 * 60 * 1000;
    const d7  =  7 * 24 * 60 * 60 * 1000;
    const d1  =  1 * 24 * 60 * 60 * 1000;

    const mau = profileData.filter(
      (p) => p.lastSeen && now - p.lastSeen.getTime() < d30,
    ).length;

    const wau = profileData.filter(
      (p) => p.lastSeen && now - p.lastSeen.getTime() < d7,
    ).length;

    const dau = profileData.filter(
      (p) => p.lastSeen && now - p.lastSeen.getTime() < d1,
    ).length;

    const activatedCount = profileData.filter((p) => p.activated === true).length;

    const activationRate = profileData.length > 0
      ? Math.round((activatedCount / profileData.length) * 100)
      : 0;

    const dormantCount = profileData.filter(
      (p) => !p.lastSeen || now - p.lastSeen.getTime() >= d30,
    ).length;

    const pctDormant = profileData.length > 0
      ? Math.round((dormantCount / profileData.length) * 100)
      : 0;

    const activeSessions = profileData
      .map((p) => p.sessionCount ?? 0)
      .filter(Boolean);

    const avgSessions = activeSessions.length > 0
      ? Math.round(activeSessions.reduce((a, b) => a + b, 0) / activeSessions.length)
      : 0;

    const aggregates: Record<string, number> = {
      PROD_mau:              mau,
      PROD_wau:              wau,
      PROD_dau:              dau,
      PROD_activation_rate:  activationRate,
      PROD_avg_sessions_30d: avgSessions,
      PROD_pct_dormant:      pctDormant,
    };

    const recordId = await upsertCdmRecord({
      orgId,
      externalCompanyId: CDM_AGGREGATE_EXTERNAL_ID,
      name: 'Mixpanel — Org Aggregates',
      data: aggregates,
    });

    let fieldsWritten = 0;
    for (const [fieldKey, value] of Object.entries(aggregates)) {
      await upsertCdmFieldValue({
        recordId,
        orgId,
        fieldKey,
        value,
        sourceType: 'mixpanel',
        confidence: 1.0,
      });
      fieldsWritten++;
    }

    await recomputeCdmFillRate(recordId, orgId);

    return fieldsWritten;
  }

  private authHeaders(
    serviceAccountUsername: string,
    serviceAccountSecret: string,
  ): Record<string, string> {
    const credentials = Buffer.from(
      `${serviceAccountUsername}:${serviceAccountSecret}`,
    ).toString('base64');
    return {
      Authorization: `Basic ${credentials}`,
      Accept:        'application/json',
    };
  }
}

export const mixpanelConnector = new MixpanelConnector();

// Mixpanel People profile shape (partial — only fields we use)
type MixpanelProfile = {
  $distinct_id: string;
  $properties:  Record<string, unknown>;
};
