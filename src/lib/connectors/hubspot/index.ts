import { Connector, ConnectorConfig, HubSpotConfig, SyncResult } from '../types';
import { fetchWithRetry } from '../fetch-with-retry';
import { upsertCdmRecord, upsertCdmFieldValue, recomputeCdmFillRate } from '@/lib/records/cdm';
import { upsertUdmRecord, upsertUdmFieldValue, recomputeUdmFillRate } from '@/lib/records/udm';
import {
  HUBSPOT_COMPANY_MAPPINGS,
  HUBSPOT_CONTACT_MAPPINGS,
  HUBSPOT_COMPANY_PROPERTIES,
  HUBSPOT_CONTACT_PROPERTIES,
} from './mappings';

const HUBSPOT_BASE = 'https://api.hubapi.com';
const PAGE_SIZE = 100;

export class HubSpotConnector implements Connector {
  readonly sourceType = 'hubspot';

  async testConnection(config: ConnectorConfig): Promise<{ ok: boolean; error?: string }> {
    const { apiKey } = config as HubSpotConfig;
    try {
      const res = await fetchWithRetry(
        `${HUBSPOT_BASE}/crm/v3/objects/contacts?limit=1`,
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );
      if (res.ok) return { ok: true };
      return { ok: false, error: `HubSpot returned ${res.status}` };
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
    const { apiKey } = input.config as HubSpotConfig;
    let recordsUpserted = 0;
    let fieldsUpdated = 0;

    if (input.businessType === 'b2b') {
      const companyResult = await this.syncCompanies(apiKey, input.orgId);
      recordsUpserted += companyResult.recordsUpserted;
      fieldsUpdated += companyResult.fieldsUpdated;
    }

    const contactResult = await this.syncContacts(apiKey, input.orgId);
    recordsUpserted += contactResult.recordsUpserted;
    fieldsUpdated += contactResult.fieldsUpdated;

    return { recordsUpserted, fieldsUpdated };
  }

  private async syncCompanies(apiKey: string, orgId: string): Promise<SyncResult> {
    let recordsUpserted = 0;
    let fieldsUpdated = 0;
    let after: string | undefined;

    do {
      const url = new URL(`${HUBSPOT_BASE}/crm/v3/objects/companies`);
      url.searchParams.set('limit', String(PAGE_SIZE));
      url.searchParams.set('properties', HUBSPOT_COMPANY_PROPERTIES.join(','));
      if (after) url.searchParams.set('after', after);

      const res = await fetchWithRetry(url.toString(), {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!res.ok) throw new Error(`HubSpot companies API error: ${res.status}`);

      const json = await res.json() as { results?: HubSpotObject[]; paging?: HubSpotPaging };
      const companies = json.results ?? [];

      for (const company of companies) {
        const props = company.properties ?? {};
        const data: Record<string, unknown> = {};

        for (const [hsKey, fieldKey] of Object.entries(HUBSPOT_COMPANY_MAPPINGS)) {
          const val = props[hsKey];
          if (val !== undefined && val !== null && val !== '') {
            data[fieldKey] = val;
          }
        }

        const recordId = await upsertCdmRecord({
          orgId,
          externalCompanyId: company.id,
          domain: props.domain,
          name: props.name,
          data,
        });

        for (const [fieldKey, value] of Object.entries(data)) {
          await upsertCdmFieldValue({
            recordId,
            orgId,
            fieldKey,
            value,
            sourceType: 'hubspot',
            confidence: 1.0,
          });
          fieldsUpdated++;
        }

        await recomputeCdmFillRate(recordId, orgId);
        recordsUpserted++;
      }

      after = json.paging?.next?.after ?? undefined;
    } while (after);

    return { recordsUpserted, fieldsUpdated };
  }

  private async syncContacts(apiKey: string, orgId: string): Promise<SyncResult> {
    let recordsUpserted = 0;
    let fieldsUpdated = 0;
    let after: string | undefined;

    do {
      const url = new URL(`${HUBSPOT_BASE}/crm/v3/objects/contacts`);
      url.searchParams.set('limit', String(PAGE_SIZE));
      url.searchParams.set('properties', HUBSPOT_CONTACT_PROPERTIES.join(','));
      if (after) url.searchParams.set('after', after);

      const res = await fetchWithRetry(url.toString(), {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!res.ok) throw new Error(`HubSpot contacts API error: ${res.status}`);

      const json = await res.json() as { results?: HubSpotObject[]; paging?: HubSpotPaging };
      const contacts = json.results ?? [];

      for (const contact of contacts) {
        const props = contact.properties ?? {};
        const data: Record<string, unknown> = {};

        for (const [hsKey, fieldKey] of Object.entries(HUBSPOT_CONTACT_MAPPINGS)) {
          const val = props[hsKey];
          if (val !== undefined && val !== null && val !== '') {
            data[fieldKey] = val;
          }
        }

        const recordId = await upsertUdmRecord({
          orgId,
          externalUserId: contact.id,
          email: props.email,
          data,
        });

        for (const [fieldKey, value] of Object.entries(data)) {
          await upsertUdmFieldValue({
            recordId,
            orgId,
            fieldKey,
            value,
            sourceType: 'hubspot',
            confidence: 1.0,
          });
          fieldsUpdated++;
        }

        await recomputeUdmFillRate(recordId, orgId);
        recordsUpserted++;
      }

      after = json.paging?.next?.after ?? undefined;
    } while (after);

    return { recordsUpserted, fieldsUpdated };
  }
}

type HubSpotObject = {
  id: string;
  properties: Record<string, string | undefined>;
};

type HubSpotPaging = {
  next?: { after: string };
};

export const hubspotConnector = new HubSpotConnector();
