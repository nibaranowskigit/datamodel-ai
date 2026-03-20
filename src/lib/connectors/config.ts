// NEVER import this in a client component or expose to API responses
import { db } from '@/lib/db';
import { dataSources } from '@/lib/db/schema';
import { decrypt } from '@/lib/encryption';
import { and, eq } from 'drizzle-orm';

export async function getDecryptedConfig(
  sourceId: string,
  orgId: string
): Promise<Record<string, string>> {
  const source = await db.query.dataSources.findFirst({
    where: and(
      eq(dataSources.id, sourceId),
      eq(dataSources.orgId, orgId),
      eq(dataSources.status, 'active')
    ),
  });

  if (!source || !source.connectionConfig) {
    throw new Error(`No active config for source ${sourceId}`);
  }

  return JSON.parse(decrypt(source.connectionConfig)) as Record<string, string>;
}
