import { db } from '@/lib/db';
import {
  udmRecords,
  udmFieldValues,
  identityMatches,
  identityReviewQueue,
  cdmConflicts,
} from '@/lib/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { findMatch, type ProfileData } from './rules';

/**
 * R6: auto-merge when confidence >= threshold (0.85 merges domain+name; domain-only 0.5 queues).
 * Configurable per org later; strict review tier referenced at 0.9.
 */
export const AUTO_MERGE_THRESHOLD = 0.85;
export const STRICT_REVIEW_THRESHOLD = 0.9;

const SOURCE_PRIORITY: Record<string, number> = {
  hubspot:  1,
  stripe:   2,
  intercom: 3,
  mixpanel: 4,
};

export type ResolutionResult = {
  autoMerged: number;
  queued:     number;
};

export type RecordWithValues = {
  id:          string;
  email:       string | null;
  data:        unknown;
  fieldValues: { fieldKey: string; value: unknown; sourceType: string; confidence: number; previousValue: unknown }[];
};

function sourceTypesFromFieldValues(
  fvs: { sourceType: string }[],
): string[] {
  const s = new Set<string>();
  for (const fv of fvs) {
    if (fv.sourceType !== 'reconciled') s.add(fv.sourceType);
  }
  return [...s];
}

function fieldMapFromValues(
  fvs: { fieldKey: string; value: unknown }[],
): Record<string, unknown> {
  const m: Record<string, unknown> = {};
  for (const fv of fvs) {
    if (m[fv.fieldKey] === undefined) m[fv.fieldKey] = fv.value;
  }
  return m;
}

function singleSourceOverlap(typesA: string[], typesB: string[]): boolean {
  if (typesA.length !== 1 || typesB.length !== 1) return false;
  return typesA[0] === typesB[0];
}

function dominantSourceRank(types: string[]): number {
  let best = 99;
  for (const t of types) {
    const r = SOURCE_PRIORITY[t] ?? 9;
    if (r < best) best = r;
  }
  return best;
}

export function pickPrimaryRecord(a: RecordWithValues, b: RecordWithValues): RecordWithValues {
  const ra = dominantSourceRank(sourceTypesFromFieldValues(a.fieldValues));
  const rb = dominantSourceRank(sourceTypesFromFieldValues(b.fieldValues));
  if (ra !== rb) return ra <= rb ? a : b;
  return a.id <= b.id ? a : b;
}

export async function resolveRootRecordId(orgId: string, startId: string): Promise<string> {
  let id = startId;
  for (let i = 0; i < 32; i++) {
    const row = await db.query.udmRecords.findFirst({
      where: and(eq(udmRecords.id, id), eq(udmRecords.orgId, orgId)),
      columns: { aliasOfId: true },
    });
    if (!row) return startId;
    if (!row.aliasOfId) return id;
    id = row.aliasOfId;
  }
  throw new Error('Alias chain too deep');
}

export async function mergeUdmIdentityRecords(
  orgId: string,
  primaryId: string,
  aliasId: string,
  confidence: number,
): Promise<void> {
  const rootP = await resolveRootRecordId(orgId, primaryId);
  const rootA = await resolveRootRecordId(orgId, aliasId);
  if (rootP === rootA) return;

  const [recP, recA] = await Promise.all([
    db.query.udmRecords.findFirst({
      where: and(eq(udmRecords.id, rootP), eq(udmRecords.orgId, orgId)),
      with: {
        fieldValues: {
          columns: {
            fieldKey: true,
            value: true,
            sourceType: true,
            confidence: true,
            previousValue: true,
          },
        },
      },
    }),
    db.query.udmRecords.findFirst({
      where: and(eq(udmRecords.id, rootA), eq(udmRecords.orgId, orgId)),
      with: {
        fieldValues: {
          columns: {
            fieldKey: true,
            value: true,
            sourceType: true,
            confidence: true,
            previousValue: true,
          },
        },
      },
    }),
  ]);

  if (!recP || !recA) return;

  const primary = pickPrimaryRecord(recP as RecordWithValues, recA as RecordWithValues);
  const alias = primary.id === recP.id ? recA : recP;

  const aliasConflicts = await db.query.cdmConflicts.findMany({
    where: and(eq(cdmConflicts.orgId, orgId), eq(cdmConflicts.udmRecordId, alias.id)),
  });
  for (const row of aliasConflicts) {
    const existing = await db.query.cdmConflicts.findFirst({
      where: and(
        eq(cdmConflicts.orgId, orgId),
        eq(cdmConflicts.udmRecordId, primary.id),
        eq(cdmConflicts.fieldKey, row.fieldKey),
      ),
    });
    if (existing) {
      await db.delete(cdmConflicts).where(eq(cdmConflicts.id, row.id));
    } else {
      await db
        .update(cdmConflicts)
        .set({ udmRecordId: primary.id })
        .where(eq(cdmConflicts.id, row.id));
    }
  }

  for (const fv of alias.fieldValues) {
    const existing = await db.query.udmFieldValues.findFirst({
      where: and(
        eq(udmFieldValues.recordId, primary.id),
        eq(udmFieldValues.orgId, orgId),
        eq(udmFieldValues.fieldKey, fv.fieldKey),
      ),
    });
    if (existing) continue;

    await db.insert(udmFieldValues).values({
      recordId:      primary.id,
      orgId,
      fieldKey:      fv.fieldKey,
      value:         fv.value,
      sourceType:    fv.sourceType,
      confidence:    fv.confidence,
      previousValue: fv.previousValue,
      syncedAt:      new Date(),
    });
  }

  await db
    .delete(udmFieldValues)
    .where(and(eq(udmFieldValues.recordId, alias.id), eq(udmFieldValues.orgId, orgId)));

  const pData =
    typeof primary.data === 'object' && primary.data !== null && !Array.isArray(primary.data)
      ? (primary.data as Record<string, unknown>)
      : {};
  const aData =
    typeof alias.data === 'object' && alias.data !== null && !Array.isArray(alias.data)
      ? (alias.data as Record<string, unknown>)
      : {};

  const mergedData: Record<string, unknown> = {
    ...aData,
    ...pData,
    UDM_identity_confidence: confidence,
  };

  await db
    .update(udmRecords)
    .set({
      data:      mergedData,
      email:     primary.email ?? alias.email,
      updatedAt: new Date(),
    })
    .where(and(eq(udmRecords.id, primary.id), eq(udmRecords.orgId, orgId)));

  await db
    .update(udmRecords)
    .set({
      aliasOfId: primary.id,
      updatedAt: new Date(),
    })
    .where(and(eq(udmRecords.id, alias.id), eq(udmRecords.orgId, orgId)));

  const { recomputeUdmFillRate } = await import('@/lib/records/udm');
  await recomputeUdmFillRate(primary.id, orgId);
}

export async function resolveIdentities(orgId: string): Promise<ResolutionResult> {
  let autoMerged = 0;
  let queued = 0;

  const records = await db.query.udmRecords.findMany({
    where: and(eq(udmRecords.orgId, orgId), isNull(udmRecords.aliasOfId)),
    columns: { id: true, email: true },
    with: {
      fieldValues: {
        columns: {
          fieldKey: true,
          value: true,
          sourceType: true,
          confidence: true,
          previousValue: true,
        },
      },
    },
  });

  const suppressed = await db.query.identityReviewQueue.findMany({
    where: and(
      eq(identityReviewQueue.orgId, orgId),
      eq(identityReviewQueue.suppressed, true),
    ),
    columns: { recordIdA: true, recordIdB: true },
  });
  const suppressedPairs = new Set<string>();
  for (const s of suppressed) {
    suppressedPairs.add(`${s.recordIdA}:${s.recordIdB}`);
    suppressedPairs.add(`${s.recordIdB}:${s.recordIdA}`);
  }

  const existing = await db.query.identityMatches.findMany({
    where: eq(identityMatches.orgId, orgId),
    columns: { primaryRecordId: true, aliasRecordId: true },
  });
  const existingPairs = new Set<string>();
  for (const e of existing) {
    existingPairs.add(`${e.primaryRecordId}:${e.aliasRecordId}`);
    existingPairs.add(`${e.aliasRecordId}:${e.primaryRecordId}`);
  }

  const loaded: RecordWithValues[] = records.map((r) => ({
    id:          r.id,
    email:       r.email,
    data:        {},
    fieldValues: r.fieldValues,
  }));

  const profiles: ProfileData[] = loaded.map((r) => ({
    id:          r.id,
    email:       r.email,
    sourceTypes: sourceTypesFromFieldValues(r.fieldValues),
    fields:      fieldMapFromValues(r.fieldValues),
  }));

  for (let i = 0; i < profiles.length; i++) {
    for (let j = i + 1; j < profiles.length; j++) {
      const a = profiles[i];
      const b = profiles[j];
      const recA = loaded[i];
      const recB = loaded[j];

      if (singleSourceOverlap(a.sourceTypes, b.sourceTypes)) continue;

      const pairKey = `${a.id}:${b.id}`;
      const pairKeyRev = `${b.id}:${a.id}`;
      if (suppressedPairs.has(pairKey) || suppressedPairs.has(pairKeyRev)) continue;

      if (existingPairs.has(pairKey) || existingPairs.has(pairKeyRev)) continue;

      const match = findMatch(a, b);
      if (!match) continue;

      const [recordIdA, recordIdB] = a.id < b.id ? [a.id, b.id] : [b.id, a.id];

      if (match.confidence >= AUTO_MERGE_THRESHOLD) {
        const primary = pickPrimaryRecord(recA, recB);
        const alias = primary.id === recA.id ? recB : recA;

        const insertedMatch = await db
          .insert(identityMatches)
          .values({
            orgId,
            primaryRecordId: primary.id,
            aliasRecordId:   alias.id,
            matchRule:       match.rule,
            confidence:      match.confidence,
            autoMerged:      true,
          })
          .onConflictDoNothing()
          .returning({ id: identityMatches.id });

        if (insertedMatch.length > 0) {
          await mergeUdmIdentityRecords(orgId, primary.id, alias.id, match.confidence);
          existingPairs.add(`${primary.id}:${alias.id}`);
          existingPairs.add(`${alias.id}:${primary.id}`);
          autoMerged++;
        }
      } else {
        const insertedQueue = await db
          .insert(identityReviewQueue)
          .values({
            orgId,
            recordIdA,
            recordIdB,
            matchRule:  match.rule,
            confidence: match.confidence,
            evidenceA:  JSON.stringify({ email: a.email, sourceTypes: a.sourceTypes, ...match.evidence }),
            evidenceB:  JSON.stringify({ email: b.email, sourceTypes: b.sourceTypes, ...match.evidence }),
            status:     'pending',
          })
          .onConflictDoNothing()
          .returning({ id: identityReviewQueue.id });

        if (insertedQueue.length > 0) queued++;
      }
    }
  }

  return { autoMerged, queued };
}
