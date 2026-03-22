'use server';

import { db } from '@/lib/db';
import { dataSources } from '@/lib/db/schema';
import { getAuth } from '@/lib/auth';
import { requireRole } from '@/lib/roles';
import { encrypt, decrypt } from '@/lib/encryption';
import { and, eq, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import type { sourceTypeEnum } from '@/lib/db/schema';

type SourceType = typeof sourceTypeEnum.enumValues[number];

// Connect a new source — encrypts credentials before write
export async function connectSource(input: {
  sourceType: SourceType;
  displayName: string;
  config: Record<string, string>; // raw credentials from form
}) {
  await requireRole('org:member');
  const { orgId, userId } = await getAuth();

  // Check for duplicate active/pending connection for this org + source type
  const existing = await db.query.dataSources.findFirst({
    where: and(
      eq(dataSources.orgId, orgId),
      eq(dataSources.sourceType, input.sourceType),
      ne(dataSources.status, 'inactive')
    ),
  });

  if (existing) {
    throw new Error(
      `A ${input.sourceType} connection already exists. Disconnect it before reconnecting.`
    );
  }

  // Never log or expose config — encrypt immediately
  const encryptedConfig = encrypt(JSON.stringify(input.config));

  await db.insert(dataSources).values({
    orgId,
    sourceType: input.sourceType,
    displayName: input.displayName,
    connectionConfig: encryptedConfig,
    status: 'pending',
    createdBy: userId,
  });

  revalidatePath('/onboarding/connect');
  revalidatePath('/settings/sources');
}

// Disconnect a source — soft delete, purge credentials — Admin only (destructive)
export async function disconnectSource(sourceId: string) {
  await requireRole('org:admin');
  const { orgId } = await getAuth();

  const source = await db.query.dataSources.findFirst({
    where: and(
      eq(dataSources.id, sourceId),
      eq(dataSources.orgId, orgId)
    ),
  });

  if (!source) throw new Error('Source not found');

  await db
    .update(dataSources)
    .set({
      status: 'inactive',
      connectionConfig: null, // purge credentials on disconnect
      updatedAt: new Date(),
    })
    .where(and(eq(dataSources.id, sourceId), eq(dataSources.orgId, orgId)));

  revalidatePath('/settings/sources');
}

// Reconnect an existing source with new credentials — Admin only
export async function reconnectSource(input: {
  sourceId: string;
  config: Record<string, string>;
}) {
  await requireRole('org:admin');
  const { orgId } = await getAuth();

  const source = await db.query.dataSources.findFirst({
    where: and(
      eq(dataSources.id, input.sourceId),
      eq(dataSources.orgId, orgId)
    ),
  });

  if (!source) throw new Error('Source not found.');

  const encryptedConfig = encrypt(JSON.stringify(input.config));

  await db
    .update(dataSources)
    .set({
      connectionConfig: encryptedConfig,
      status: 'pending',
      lastSyncError: null,
      updatedAt: new Date(),
    })
    .where(and(
      eq(dataSources.id, input.sourceId),
      eq(dataSources.orgId, orgId)
    ));

  revalidatePath('/settings/sources');
}

// Get all active/pending sources for an org — no credentials returned
export async function getActiveSources(orgId: string) {
  return db.query.dataSources.findMany({
    where: and(
      eq(dataSources.orgId, orgId),
      ne(dataSources.status, 'inactive')
    ),
    columns: {
      connectionConfig: false, // NEVER return encrypted config to client
    },
  });
}
