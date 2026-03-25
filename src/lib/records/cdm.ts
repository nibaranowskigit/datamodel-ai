import { db } from '@/lib/db';
import { cdmRecords, cdmFieldValues, orgs, udmFields } from '@/lib/db/schema';
import { and, eq, count } from 'drizzle-orm';

async function assertB2BOrg(orgId: string) {
  const org = await db.query.orgs.findFirst({ where: eq(orgs.id, orgId) });
  if (!org) throw new Error('Org not found');
  if (org.businessType !== 'b2b') {
    throw new Error('CDM records are only available for B2B orgs');
  }
}

export async function upsertCdmRecord(input: {
  orgId: string;
  externalCompanyId: string;
  domain?: string;
  name?: string;
  data: Record<string, unknown>;
}): Promise<string> {
  await assertB2BOrg(input.orgId);

  const existing = await db.query.cdmRecords.findFirst({
    where: and(
      eq(cdmRecords.orgId, input.orgId),
      eq(cdmRecords.externalCompanyId, input.externalCompanyId)
    ),
  });

  if (existing) {
    await db
      .update(cdmRecords)
      .set({
        data: input.data,
        domain: input.domain ?? existing.domain,
        name: input.name ?? existing.name,
        updatedAt: new Date(),
      })
      .where(eq(cdmRecords.id, existing.id));
    return existing.id;
  }

  const [record] = await db
    .insert(cdmRecords)
    .values({
      orgId: input.orgId,
      externalCompanyId: input.externalCompanyId,
      domain: input.domain,
      name: input.name,
      data: input.data,
    })
    .returning({ id: cdmRecords.id });

  return record.id;
}

export async function upsertCdmFieldValue(input: {
  recordId: string;
  orgId: string;
  fieldKey: string;
  value: unknown;
  sourceType: string;
  confidence?: number;
}) {
  const existing = await db.query.cdmFieldValues.findFirst({
    where: and(
      eq(cdmFieldValues.recordId, input.recordId),
      eq(cdmFieldValues.fieldKey, input.fieldKey)
    ),
  });

  if (existing) {
    await db
      .update(cdmFieldValues)
      .set({
        previousValue: existing.value,
        value: input.value,
        sourceType: input.sourceType,
        confidence: input.confidence ?? 1.0,
        syncedAt: new Date(),
      })
      .where(eq(cdmFieldValues.id, existing.id));
  } else {
    await db.insert(cdmFieldValues).values({
      recordId: input.recordId,
      orgId: input.orgId,
      fieldKey: input.fieldKey,
      value: input.value,
      sourceType: input.sourceType,
      confidence: input.confidence ?? 1.0,
    });
  }
}

export async function recomputeCdmFillRate(recordId: string, orgId: string) {
  const [{ total }] = await db
    .select({ total: count() })
    .from(udmFields)
    .where(and(
      eq(udmFields.orgId, orgId),
      eq(udmFields.status, 'production')
    ));

  if (!total || total === 0) return;

  const [{ filled }] = await db
    .select({ filled: count() })
    .from(cdmFieldValues)
    .where(and(
      eq(cdmFieldValues.recordId, recordId),
      eq(cdmFieldValues.orgId, orgId)
    ));

  const fillRate = Number(filled) / Number(total);

  await db
    .update(cdmRecords)
    .set({ fillRate, updatedAt: new Date() })
    .where(eq(cdmRecords.id, recordId));
}
