import { db } from '@/lib/db';
import {
  udmRecords,
  udmFieldValues,
  cdmConflicts,
  reconciliationRules,
} from '@/lib/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { isConflict, mostRecentDate, normalise, parseNumeric } from './normalise';
import {
  buildPriorityMapForField,
  findPriorityOrderedConflictPair,
  resolveField,
  sortCandidatesByPriority,
  type ReconciliationRuleRow,
  type SourceValue,
} from './resolve';

// Date-type fields where "most recent wins" auto-resolves the conflict.
const AUTO_RESOLVE_MOST_RECENT = new Set([
  'HS_last_activity_date',
  'PROD_last_seen',
  'SUP_last_contact_date',
]);

// Product analytics — highest numeric wins (no human conflict row).
const AUTO_RESOLVE_HIGHEST_NUMERIC = new Set(['PROD_mau', 'PROD_dau']);

// Source-exclusive IDs — each source owns these; no cross-source conflict possible.
const EXCLUSIVE_FIELDS = new Set([
  'HS_hubspot_contact_id',
  'FIN_stripe_customer_id',
  'SUP_intercom_contact_id',
  'PROD_mixpanel_distinct_id',
]);

function coalesceMostRecent(values: unknown[]): string | null {
  let acc: string | null = null;
  for (const v of values) {
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (!s) continue;
    acc = mostRecentDate(acc, s);
  }
  return acc;
}

export async function reconcileUDMRecords(orgId: string): Promise<{
  merged: number;
  conflicts: number;
  autoResolved: number;
}> {
  const allRules: ReconciliationRuleRow[] = await db.query.reconciliationRules.findMany({
    where: eq(reconciliationRules.orgId, orgId),
    columns: { namespace: true, sourceType: true, priority: true },
  });

  const records = await db.query.udmRecords.findMany({
    where: and(eq(udmRecords.orgId, orgId), isNull(udmRecords.aliasOfId)),
    columns: { id: true, email: true },
    with: {
      fieldValues: {
        columns: { id: true, fieldKey: true, value: true, sourceType: true },
      },
    },
  });

  const byEmail = new Map<string, typeof records>();
  for (const record of records) {
    if (!record.email) continue;
    const key = normalise(record.email)!;
    if (!byEmail.has(key)) byEmail.set(key, []);
    byEmail.get(key)!.push(record);
  }

  let merged = 0;
  let conflicts = 0;
  let autoResolved = 0;

  for (const [, group] of byEmail) {
    if (group.length <= 1) continue;

    try {
      const fieldMap = new Map<string, Map<string, { value: unknown; recordId: string }>>();
      for (const record of group) {
        for (const fv of record.fieldValues) {
          if (!fieldMap.has(fv.fieldKey)) fieldMap.set(fv.fieldKey, new Map());
          fieldMap.get(fv.fieldKey)!.set(fv.sourceType, {
            value:    fv.value,
            recordId: record.id,
          });
        }
      }

      const primaryRecord =
        group.find((r) => r.fieldValues.some((fv) => fv.sourceType === 'hubspot')) ??
        group[0];

      const newConflicts: (typeof cdmConflicts.$inferInsert)[] = [];

      for (const [fieldKey, sourceMap] of fieldMap) {
        if (EXCLUSIVE_FIELDS.has(fieldKey)) continue;
        if (sourceMap.size <= 1) continue;

        const entries: SourceValue[] = [...sourceMap.entries()].map(([sourceType, { value }]) => ({
          sourceType,
          value,
        }));

        const priorityMap = buildPriorityMapForField(fieldKey, allRules);
        const sorted = sortCandidatesByPriority(priorityMap, entries);

        // ── Auto: most recent timestamp ─────────────────────────────────────
        if (AUTO_RESOLVE_MOST_RECENT.has(fieldKey)) {
          const resolved = coalesceMostRecent(entries.map((e) => e.value));
          if (resolved !== null) {
            await db
              .insert(udmFieldValues)
              .values({
                recordId:   primaryRecord.id,
                orgId,
                fieldKey,
                value:      resolved,
                sourceType: 'reconciled',
              })
              .onConflictDoUpdate({
                target: [udmFieldValues.recordId, udmFieldValues.fieldKey],
                set:    { value: resolved, sourceType: 'reconciled', syncedAt: new Date() },
              });
          }
          const norms = new Set(
            entries
              .map((e) => normalise(e.value))
              .filter((x): x is string => x !== null)
          );
          if (norms.size > 1) autoResolved++;
          continue;
        }

        // ── Auto: highest numeric (product metrics) ─────────────────────────
        if (AUTO_RESOLVE_HIGHEST_NUMERIC.has(fieldKey)) {
          const nums = entries.map((e) => parseNumeric(e.value));
          if (nums.every((n) => n !== null) && entries.length > 1) {
            const maxN = Math.max(...(nums as number[]));
            const winnerEntry = sorted.find((e) => parseNumeric(e.value) === maxN)!;
            await db
              .insert(udmFieldValues)
              .values({
                recordId:   primaryRecord.id,
                orgId,
                fieldKey,
                value:      winnerEntry.value,
                sourceType: winnerEntry.sourceType,
              })
              .onConflictDoUpdate({
                target: [udmFieldValues.recordId, udmFieldValues.fieldKey],
                set:    {
                  value:      winnerEntry.value,
                  sourceType: winnerEntry.sourceType,
                  syncedAt:   new Date(),
                },
              });
            const distinct = new Set(nums);
            if (distinct.size > 1) autoResolved++;
            continue;
          }
        }

        // ── FIN_* fields: all numeric → master by priority, no human conflict ─
        if (fieldKey.startsWith('FIN_')) {
          const nums = entries.map((e) => parseNumeric(e.value));
          if (nums.every((n) => n !== null) && entries.length > 1) {
            const resolution = await resolveField(orgId, fieldKey, entries, allRules);
            if (resolution) {
              await db
                .insert(udmFieldValues)
                .values({
                  recordId:   primaryRecord.id,
                  orgId,
                  fieldKey,
                  value:      resolution.value,
                  sourceType: resolution.winner,
                })
                .onConflictDoUpdate({
                  target: [udmFieldValues.recordId, udmFieldValues.fieldKey],
                  set:    {
                    value:      resolution.value,
                    sourceType: resolution.winner,
                    syncedAt:   new Date(),
                  },
                });
            }
            continue;
          }
        }

        const resolution = await resolveField(orgId, fieldKey, entries, allRules);
        if (resolution) {
          await db
            .insert(udmFieldValues)
            .values({
              recordId:   primaryRecord.id,
              orgId,
              fieldKey,
              value:      resolution.value,
              sourceType: resolution.winner,
            })
            .onConflictDoUpdate({
              target: [udmFieldValues.recordId, udmFieldValues.fieldKey],
              set:    {
                value:      resolution.value,
                sourceType: resolution.winner,
                syncedAt:   new Date(),
              },
            });
        }

        const pair = findPriorityOrderedConflictPair(sorted);
        if (!pair) continue;

        const [first, second] = pair;
        newConflicts.push({
          orgId,
          udmRecordId: primaryRecord.id,
          fieldKey,
          sourceTypeA: first.sourceType,
          valueA:      first.value != null ? String(first.value) : null,
          sourceTypeB: second.sourceType,
          valueB:      second.value != null ? String(second.value) : null,
          autoResolved: false,
        });
      }

      if (newConflicts.length > 0) {
        const inserted = await db
          .insert(cdmConflicts)
          .values(newConflicts)
          .onConflictDoNothing()
          .returning({ id: cdmConflicts.id });
        conflicts += inserted.length;
      }

      merged++;
    } catch {
      // One bad email group must not abort the whole reconcile run.
    }
  }

  return { merged, conflicts, autoResolved };
}
