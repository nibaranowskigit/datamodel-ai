import { db } from '@/lib/db';
import {
  udmRecords,
  udmFieldValues,
  cdmRecords,
  cdmFieldValues,
  udmFields,
  proposedFields,
} from '@/lib/db/schema';
import { and, eq, inArray, isNull } from 'drizzle-orm';

export type FieldSample = {
  fieldKey:     string;
  sampleValues: string[];
  recordCount:  number;
  sourceType:   string;
  dataType:     'string' | 'number' | 'boolean' | 'date' | 'unknown';
};

type ValueRow = { fieldKey: string; value: unknown; sourceType: string };

function valueToSampleString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 100);
  return String(value).slice(0, 100);
}

function aggregateSamples(rows: ValueRow[]): FieldSample[] {
  const fieldMap = new Map<
    string,
    { values: Set<string>; count: number; sourceType: string }
  >();

  for (const row of rows) {
    const str = valueToSampleString(row.value);
    if (!str) continue;

    if (!fieldMap.has(row.fieldKey)) {
      fieldMap.set(row.fieldKey, {
        values:     new Set(),
        count:      0,
        sourceType: row.sourceType,
      });
    }
    const entry = fieldMap.get(row.fieldKey)!;
    entry.count++;
    if (entry.values.size < 5) entry.values.add(str);
  }

  return Array.from(fieldMap.entries()).map(([fieldKey, data]) => ({
    fieldKey,
    sampleValues: Array.from(data.values),
    recordCount:  data.count,
    sourceType:   data.sourceType,
    dataType:     inferDataType(data.values),
  }));
}

export async function sampleUDMFields(orgId: string): Promise<FieldSample[]> {
  const primary = await db.query.udmRecords.findMany({
    where:   and(eq(udmRecords.orgId, orgId), isNull(udmRecords.aliasOfId)),
    columns: { id: true },
    limit:   200,
  });

  if (primary.length === 0) return [];

  const ids = primary.map((r) => r.id);
  const rows = await db.query.udmFieldValues.findMany({
    where:   and(eq(udmFieldValues.orgId, orgId), inArray(udmFieldValues.recordId, ids)),
    columns: { fieldKey: true, value: true, sourceType: true },
  });

  return aggregateSamples(rows);
}

export async function sampleCDMFields(orgId: string): Promise<FieldSample[]> {
  const companies = await db.query.cdmRecords.findMany({
    where:   eq(cdmRecords.orgId, orgId),
    columns: { id: true },
    limit:   200,
  });

  if (companies.length === 0) return [];

  const ids = companies.map((c) => c.id);
  const rows = await db.query.cdmFieldValues.findMany({
    where:   and(eq(cdmFieldValues.orgId, orgId), inArray(cdmFieldValues.recordId, ids)),
    columns: { fieldKey: true, value: true, sourceType: true },
  });

  return aggregateSamples(rows);
}

/** Keys already in udm_fields or proposed_fields — do not propose duplicates. */
export async function getKnownFieldKeys(orgId: string): Promise<Set<string>> {
  const [registry, queue] = await Promise.all([
    db.query.udmFields.findMany({
      where:   eq(udmFields.orgId, orgId),
      columns: { fieldKey: true },
    }),
    db.query.proposedFields.findMany({
      where:   eq(proposedFields.orgId, orgId),
      columns: { fieldKey: true },
    }),
  ]);

  return new Set([
    ...registry.map((f) => f.fieldKey),
    ...queue.map((f) => f.fieldKey),
  ]);
}

function inferDataType(
  values: Set<string>,
): 'string' | 'number' | 'boolean' | 'date' | 'unknown' {
  const samples = Array.from(values).filter(Boolean);
  if (samples.length === 0) return 'unknown';
  if (samples.every((v) => v !== '' && !Number.isNaN(Number(v)))) return 'number';
  if (samples.every((v) => v === 'true' || v === 'false')) return 'boolean';
  if (
    samples.every(
      (v) => !Number.isNaN(Date.parse(v)) && (v.includes('-') || v.includes('/')),
    )
  ) {
    return 'date';
  }
  return 'string';
}
