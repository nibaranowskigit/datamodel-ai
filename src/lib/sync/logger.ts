import { db } from '@/lib/db';
import { syncLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function createSyncLog(input: {
  orgId: string;
  sourceType: string;
  syncRunId?: string;
}): Promise<string> {
  const [log] = await db
    .insert(syncLogs)
    .values({
      orgId:      input.orgId,
      sourceType: input.sourceType,
      syncRunId:  input.syncRunId ?? null,
      status:     'running',
    })
    .returning({ id: syncLogs.id });
  return log.id;
}

export async function completeSyncLog(
  logId: string,
  result: {
    recordsUpserted: number;
    fieldsUpdated: number;
    durationMs: number;
  }
) {
  await db
    .update(syncLogs)
    .set({
      status: 'success',
      recordsUpserted: result.recordsUpserted,
      fieldsUpdated: result.fieldsUpdated,
      durationMs: result.durationMs,
      completedAt: new Date(),
    })
    .where(eq(syncLogs.id, logId));
}

export async function failSyncLog(logId: string, error: Error, durationMs: number) {
  await db
    .update(syncLogs)
    .set({
      status: 'error',
      errorMessage: error.message,
      durationMs,
      completedAt: new Date(),
    })
    .where(eq(syncLogs.id, logId));
}
