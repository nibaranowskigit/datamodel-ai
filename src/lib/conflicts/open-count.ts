import { db } from '@/lib/db';
import { cdmConflicts } from '@/lib/db/schema';
import { and, count, eq, isNull } from 'drizzle-orm';

/** Unresolved conflicts for the org (for badges / dashboard). */
export async function countOpenConflicts(orgId: string): Promise<number> {
  const [{ value }] = await db
    .select({ value: count() })
    .from(cdmConflicts)
    .where(and(eq(cdmConflicts.orgId, orgId), isNull(cdmConflicts.resolvedAt)));
  return Number(value ?? 0);
}
