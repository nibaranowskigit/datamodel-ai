import { db } from '@/lib/db';
import { udmRecords, udmFieldValues, udmFields } from '@/lib/db/schema';
import { and, eq, count } from 'drizzle-orm';

/** Follow `alias_of_id` to the canonical UDM row (S1.6 identity merge). */
export async function resolveCanonicalUdmRecordId(recordId: string, orgId: string): Promise<string> {
  let id = recordId;
  for (let i = 0; i < 32; i++) {
    const row = await db.query.udmRecords.findFirst({
      where: and(eq(udmRecords.id, id), eq(udmRecords.orgId, orgId)),
      columns: { aliasOfId: true },
    });
    if (!row) return recordId;
    if (!row.aliasOfId) return id;
    id = row.aliasOfId;
  }
  return recordId;
}

export async function upsertUdmRecord(input: {
  orgId: string;
  externalUserId: string;
  email?: string;
  data: Record<string, unknown>;
}): Promise<string> {
  const existing = await db.query.udmRecords.findFirst({
    where: and(
      eq(udmRecords.orgId, input.orgId),
      eq(udmRecords.externalUserId, input.externalUserId)
    ),
  });

  if (existing) {
    const targetId = await resolveCanonicalUdmRecordId(existing.id, input.orgId);
    await db
      .update(udmRecords)
      .set({
        data: input.data,
        email: input.email ?? existing.email,
        updatedAt: new Date(),
      })
      .where(eq(udmRecords.id, targetId));
    return targetId;
  }

  const [record] = await db
    .insert(udmRecords)
    .values({
      orgId: input.orgId,
      externalUserId: input.externalUserId,
      email: input.email,
      data: input.data,
    })
    .returning({ id: udmRecords.id });

  return record.id;
}

export async function upsertUdmFieldValue(input: {
  recordId: string;
  orgId: string;
  fieldKey: string;
  value: unknown;
  sourceType: string;
  confidence?: number;
}) {
  const recordId = await resolveCanonicalUdmRecordId(input.recordId, input.orgId);

  const existing = await db.query.udmFieldValues.findFirst({
    where: and(
      eq(udmFieldValues.recordId, recordId),
      eq(udmFieldValues.fieldKey, input.fieldKey)
    ),
  });

  if (existing) {
    await db
      .update(udmFieldValues)
      .set({
        previousValue: existing.value,
        value: input.value,
        sourceType: input.sourceType,
        confidence: input.confidence ?? 1.0,
        syncedAt: new Date(),
      })
      .where(eq(udmFieldValues.id, existing.id));
  } else {
    await db.insert(udmFieldValues).values({
      recordId,
      orgId: input.orgId,
      fieldKey: input.fieldKey,
      value: input.value,
      sourceType: input.sourceType,
      confidence: input.confidence ?? 1.0,
    });
  }
}

export async function recomputeUdmFillRate(recordId: string, orgId: string) {
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
    .from(udmFieldValues)
    .where(and(
      eq(udmFieldValues.recordId, recordId),
      eq(udmFieldValues.orgId, orgId)
    ));

  const fillRate = Number(filled) / Number(total);

  await db
    .update(udmRecords)
    .set({ fillRate, updatedAt: new Date() })
    .where(eq(udmRecords.id, recordId));
}
