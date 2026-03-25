'use server';

import { db } from '@/lib/db';
import { cdmConflicts, udmFieldValues } from '@/lib/db/schema';
import { getAuth } from '@/lib/auth';
import { requireRole } from '@/lib/roles';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// Resolve a detected conflict — writes the winning value to the master UDM record
// and marks the conflict row resolved. Requires org:member minimum.
export async function resolveConflict(
  conflictId: string,
  resolvedValue: string,
  resolvedSource: string
): Promise<void> {
  await requireRole('org:member');
  const { orgId, userId } = await getAuth();

  const conflict = await db.query.cdmConflicts.findFirst({
    where: and(
      eq(cdmConflicts.id, conflictId),
      eq(cdmConflicts.orgId, orgId)
    ),
  });

  if (!conflict) throw new Error('Conflict not found.');
  if (conflict.resolvedAt) throw new Error('Conflict already resolved.');

  // Mark the conflict resolved.
  await db
    .update(cdmConflicts)
    .set({
      resolvedAt:     new Date(),
      resolvedBy:     userId,
      resolvedValue,
      resolvedSource,
    })
    .where(and(eq(cdmConflicts.id, conflictId), eq(cdmConflicts.orgId, orgId)));

  // Write the winning value to the master UDM record's field values.
  await db
    .insert(udmFieldValues)
    .values({
      recordId:   conflict.udmRecordId,
      orgId,
      fieldKey:   conflict.fieldKey,
      value:      resolvedValue,
      sourceType: resolvedSource,
    })
    .onConflictDoUpdate({
      target: [udmFieldValues.recordId, udmFieldValues.fieldKey],
      set:    { value: resolvedValue, sourceType: resolvedSource, syncedAt: new Date() },
    });

  revalidatePath('/conflicts');
  revalidatePath('/dashboard');
  revalidatePath('/settings/sources');
}
