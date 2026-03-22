'use server';

import { db } from '@/lib/db';
import { apiKeys } from '@/lib/db/schema';
import { getAuth } from '@/lib/auth';
import { requireRole } from '@/lib/roles';
import { and, eq, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { generateApiKey } from '@/lib/api-keys/generate';

export async function createApiKey(input: {
  name: string;
  scopes: string[];
}): Promise<{ fullKey: string; keyId: string }> {
  await requireRole('org:admin');
  const { orgId, userId } = await getAuth();

  if (!input.name.trim()) throw new Error('Key name cannot be empty.');
  if (input.name.length > 64) throw new Error('Key name must be 64 characters or less.');

  const { fullKey, prefix, hash } = generateApiKey();

  const [key] = await db
    .insert(apiKeys)
    .values({
      orgId,
      name:      input.name.trim(),
      keyPrefix: prefix,
      keyHash:   hash,
      scopes:    input.scopes,
      createdBy: userId,
    })
    .returning({ id: apiKeys.id });

  revalidatePath('/settings/api-keys');

  return { fullKey, keyId: key.id };
}

export async function revokeApiKey(keyId: string): Promise<void> {
  await requireRole('org:admin');
  const { orgId } = await getAuth();

  const key = await db.query.apiKeys.findFirst({
    where: and(eq(apiKeys.id, keyId), eq(apiKeys.orgId, orgId)),
  });
  if (!key) throw new Error('Key not found.');
  if (key.revokedAt) throw new Error('Key is already revoked.');

  await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.orgId, orgId)));

  revalidatePath('/settings/api-keys');
}

export async function rotateApiKey(keyId: string): Promise<{
  fullKey: string;
  keyId: string;
}> {
  await requireRole('org:admin');
  const { orgId, userId } = await getAuth();

  const existing = await db.query.apiKeys.findFirst({
    where: and(
      eq(apiKeys.id, keyId),
      eq(apiKeys.orgId, orgId),
      isNull(apiKeys.revokedAt)
    ),
  });
  if (!existing) throw new Error('Active key not found.');

  const { fullKey, prefix, hash } = generateApiKey();

  let newKeyId = '';

  await db.transaction(async (tx) => {
    await tx
      .update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.orgId, orgId)));

    const [newKey] = await tx
      .insert(apiKeys)
      .values({
        orgId,
        name:      `${existing.name} (rotated)`,
        keyPrefix: prefix,
        keyHash:   hash,
        scopes:    existing.scopes,
        createdBy: userId,
      })
      .returning({ id: apiKeys.id });

    newKeyId = newKey.id;
  });

  revalidatePath('/settings/api-keys');
  return { fullKey, keyId: newKeyId };
}
