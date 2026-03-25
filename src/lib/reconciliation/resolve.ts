import { db } from '@/lib/db';
import { reconciliationRules } from '@/lib/db/schema';
import { and, eq, or } from 'drizzle-orm';
import { isConflict } from './normalise';

export type SourceValue = {
  sourceType: string;
  value: unknown;
};

export type ReconciliationRuleRow = {
  namespace: string;
  sourceType: string;
  priority: number;
};

// Merge wildcard '*' rules first, then namespace-specific (overrides).
export function buildPriorityMapForField(
  fieldKey: string,
  allRules: ReconciliationRuleRow[]
): Map<string, number> {
  const underscoreIdx = fieldKey.indexOf('_');
  const namespace = underscoreIdx > 0
    ? fieldKey.substring(0, underscoreIdx + 1)
    : '*';

  const map = new Map<string, number>();
  for (const r of allRules) {
    if (r.namespace === '*') map.set(r.sourceType, r.priority);
  }
  for (const r of allRules) {
    if (r.namespace === namespace) map.set(r.sourceType, r.priority);
  }
  return map;
}

export function sortCandidatesByPriority(
  priorityMap: Map<string, number>,
  candidates: SourceValue[]
): SourceValue[] {
  return [...candidates].sort((a, b) => {
    const pa = priorityMap.get(a.sourceType) ?? 999;
    const pb = priorityMap.get(b.sourceType) ?? 999;
    return pa - pb;
  });
}

// First disagreeing pair when walking sources in priority order (PRD: multi-source edge case).
export function findPriorityOrderedConflictPair(
  sortedByPriority: SourceValue[]
): [SourceValue, SourceValue] | null {
  for (let i = 0; i < sortedByPriority.length; i++) {
    for (let j = i + 1; j < sortedByPriority.length; j++) {
      if (isConflict(sortedByPriority[i].value, sortedByPriority[j].value)) {
        return [sortedByPriority[i], sortedByPriority[j]];
      }
    }
  }
  return null;
}

// Determine the winning value for a field across multiple sources.
// Applies the org's priority rules (reconciliation_rules table).
// Returns null if no candidates have a non-null value.
export async function resolveField(
  orgId: string,
  fieldKey: string,
  candidates: SourceValue[],
  rulesCache?: ReconciliationRuleRow[]
): Promise<{ winner: string; value: unknown } | null> {
  const defined = candidates.filter((c) => c.value !== null && c.value !== undefined);
  if (defined.length === 0) return null;
  if (defined.length === 1) return { winner: defined[0].sourceType, value: defined[0].value };

  const underscoreIdx = fieldKey.indexOf('_');
  const namespace = underscoreIdx > 0
    ? fieldKey.substring(0, underscoreIdx + 1)
    : '*';

  const rules = rulesCache ?? (await db.query.reconciliationRules.findMany({
    where: and(
      eq(reconciliationRules.orgId, orgId),
      or(
        eq(reconciliationRules.namespace, namespace),
        eq(reconciliationRules.namespace, '*')
      )
    ),
    columns: { namespace: true, sourceType: true, priority: true },
  }));

  const priorityMap = buildPriorityMapForField(fieldKey, rules);
  const sorted = sortCandidatesByPriority(priorityMap, defined);

  return { winner: sorted[0].sourceType, value: sorted[0].value };
}
