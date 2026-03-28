'use server';

import { db } from '@/lib/db';
import { identityReviewQueue, identityMatches, udmRecords } from '@/lib/db/schema';
import { getAuth } from '@/lib/auth';
import { requireRole } from '@/lib/roles';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import {
  mergeUdmIdentityRecords,
  pickPrimaryRecord,
  type RecordWithValues,
} from '@/lib/identity/resolve';

const fvColumns = {
  fieldKey: true,
  value: true,
  sourceType: true,
  confidence: true,
  previousValue: true,
} as const;

export async function acceptIdentityMatch(reviewId: string): Promise<void> {
  await requireRole('org:member');
  const { orgId, userId } = await getAuth();

  const item = await db.query.identityReviewQueue.findFirst({
    where: and(
      eq(identityReviewQueue.id, reviewId),
      eq(identityReviewQueue.orgId, orgId),
      eq(identityReviewQueue.status, 'pending'),
    ),
  });
  if (!item) throw new Error('Review item not found.');

  const [ra, rb] = await Promise.all([
    db.query.udmRecords.findFirst({
      where: and(eq(udmRecords.id, item.recordIdA), eq(udmRecords.orgId, orgId)),
      with: { fieldValues: { columns: fvColumns } },
    }),
    db.query.udmRecords.findFirst({
      where: and(eq(udmRecords.id, item.recordIdB), eq(udmRecords.orgId, orgId)),
      with: { fieldValues: { columns: fvColumns } },
    }),
  ]);

  if (!ra || !rb) throw new Error('Records not found.');

  const primary = pickPrimaryRecord(ra as RecordWithValues, rb as RecordWithValues);
  const alias = primary.id === ra.id ? rb : ra;

  await db
    .update(identityReviewQueue)
    .set({ status: 'accepted', resolvedBy: userId, resolvedAt: new Date() })
    .where(eq(identityReviewQueue.id, reviewId));

  const inserted = await db
    .insert(identityMatches)
    .values({
      orgId,
      primaryRecordId: primary.id,
      aliasRecordId:   alias.id,
      matchRule:       item.matchRule,
      confidence:      item.confidence,
      autoMerged:      false,
    })
    .onConflictDoNothing()
    .returning({ id: identityMatches.id });

  if (inserted.length > 0) {
    await mergeUdmIdentityRecords(orgId, primary.id, alias.id, item.confidence);
  }

  revalidatePath('/identity');
}

export async function rejectIdentityMatch(reviewId: string): Promise<void> {
  await requireRole('org:member');
  const { orgId, userId } = await getAuth();

  await db
    .update(identityReviewQueue)
    .set({
      status:     'rejected',
      resolvedBy: userId,
      resolvedAt: new Date(),
      suppressed: true,
    })
    .where(
      and(eq(identityReviewQueue.id, reviewId), eq(identityReviewQueue.orgId, orgId)),
    );

  revalidatePath('/identity');
}
