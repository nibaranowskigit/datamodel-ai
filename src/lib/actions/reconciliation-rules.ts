'use server';

import { db } from '@/lib/db';
import { reconciliationRules } from '@/lib/db/schema';
import { getAuth } from '@/lib/auth';
import { requireRole } from '@/lib/roles';
import {
  RECONCILIATION_NAMESPACES,
  RECONCILIATION_SOURCE_TYPES,
  type ReconciliationNamespace,
} from '@/lib/reconciliation/constants';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

function isNamespace(v: string): v is ReconciliationNamespace {
  return (RECONCILIATION_NAMESPACES as readonly string[]).includes(v);
}

/** Admin updates master-source order for one namespace (priorities 1 = highest … 4). */
export async function updateReconciliationPriorities(
  namespace: string,
  priorities: Record<string, number>
): Promise<void> {
  await requireRole('org:admin');
  const { orgId } = await getAuth();

  if (!isNamespace(namespace)) {
    throw new Error('Invalid namespace.');
  }

  const allowed = new Set<string>(RECONCILIATION_SOURCE_TYPES);
  const entries = Object.entries(priorities);
  if (entries.length !== RECONCILIATION_SOURCE_TYPES.length) {
    throw new Error('Each source must have a priority.');
  }

  for (const [sourceType] of entries) {
    if (!allowed.has(sourceType)) {
      throw new Error('Invalid source type.');
    }
  }

  const ranks = entries.map(([, p]) => p);
  const sorted = [...ranks].sort((a, b) => a - b);
  const expected = RECONCILIATION_SOURCE_TYPES.map((_, i) => i + 1);
  if (sorted.length !== expected.length || sorted.some((n, i) => n !== expected[i])) {
    throw new Error('Priorities must be 1–4 with no duplicates.');
  }

  await db.transaction(async (tx) => {
    for (const [sourceType, priority] of entries) {
      await tx
        .update(reconciliationRules)
        .set({ priority, updatedAt: new Date() })
        .where(
          and(
            eq(reconciliationRules.orgId, orgId),
            eq(reconciliationRules.namespace, namespace),
            eq(reconciliationRules.sourceType, sourceType)
          )
        );
    }
  });

  revalidatePath('/settings/reconciliation');
  revalidatePath('/settings/sources');
  revalidatePath('/dashboard');
  revalidatePath('/conflicts');
}
