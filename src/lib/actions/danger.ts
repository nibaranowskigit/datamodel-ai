'use server';

import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth';
import { requireRole } from '@/lib/roles';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { inngest } from '@/lib/inngest/client';
import {
  cdmRecords,
  udmRecords,
  syncLogs,
  apiKeys,
  dataSources,
  notificationPreferences,
  orgs,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { clerkClient } from '@clerk/nextjs/server';

// ─── Export data ──────────────────────────────────────────────
// Async — triggers Inngest job, emails download link when ready
export async function requestDataExport(): Promise<void> {
  await requireRole('org:admin');
  const { orgId, userId } = await getAuth();

  await inngest.send({
    name: 'org/data.export.requested',
    data: { orgId, requestedBy: userId },
  });
}

// ─── Hard reset ───────────────────────────────────────────────
// Deletes all data records — keeps org, members, sources, keys
export async function hardResetDataModel(): Promise<void> {
  await requireRole('org:admin');
  const { orgId } = await getAuth();

  await db.transaction(async (tx) => {
    // udmFieldValues + cdmFieldValues + cdmConflicts cascade from records
    await tx.delete(udmRecords).where(eq(udmRecords.orgId, orgId));
    await tx.delete(cdmRecords).where(eq(cdmRecords.orgId, orgId));
    await tx.delete(syncLogs).where(eq(syncLogs.orgId, orgId));
  });

  revalidatePath('/settings/danger');
}

// ─── Delete org ───────────────────────────────────────────────
// Deletes everything — cascades all tables, removes Clerk org
// redirect() is called after the transaction, outside any try/catch
export async function deleteOrg(): Promise<void> {
  await requireRole('org:admin');
  const { orgId } = await getAuth();

  await db.transaction(async (tx) => {
    // Children before parents — FK-safe cascade order
    // udmFieldValues, cdmFieldValues, cdmConflicts cascade via onDelete:'cascade'
    await tx.delete(udmRecords).where(eq(udmRecords.orgId, orgId));
    await tx.delete(cdmRecords).where(eq(cdmRecords.orgId, orgId));
    await tx.delete(syncLogs).where(eq(syncLogs.orgId, orgId));
    await tx.delete(apiKeys).where(eq(apiKeys.orgId, orgId));
    await tx.delete(dataSources).where(eq(dataSources.orgId, orgId));
    await tx.delete(notificationPreferences).where(
      eq(notificationPreferences.orgId, orgId),
    );
    await tx.delete(orgs).where(eq(orgs.id, orgId));
  });

  // DB first, Clerk second — if Clerk call fails, org is already gone from DB
  const client = await clerkClient();
  await client.organizations.deleteOrganization(orgId);

  // redirect() must be outside any try/catch — it throws internally
  redirect('/create-org');
}
