import { inngest } from '../client';
import { db } from '@/lib/db';
import { dataSources, orgs } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { getConnector } from '@/lib/connectors/registry';
import { getDecryptedConfig } from '@/lib/connectors/config';
import { createSyncLog, completeSyncLog, failSyncLog } from '@/lib/sync/logger';
import type { ConnectorConfig, SyncResult } from '@/lib/connectors/types';

export const syncSourceJob = inngest.createFunction(
  {
    id: 'sync-source',
    retries: 3,
    concurrency: {
      limit: 5,
    },
    triggers: [{ event: 'sync/source.requested' as const }],
  },
  async ({ event, step }) => {
    const { orgId, sourceId, sourceType } = event.data as {
      orgId: string;
      sourceId: string;
      sourceType: string;
    };
    const startedAt = Date.now();

    // Step 1 — fetch org + source from DB
    const { org } = await step.run('fetch-org-and-source', async () => {
      const [org, source] = await Promise.all([
        db.query.orgs.findFirst({ where: eq(orgs.id, orgId) }),
        db.query.dataSources.findFirst({
          where: and(
            eq(dataSources.id, sourceId),
            eq(dataSources.orgId, orgId)
          ),
        }),
      ]);

      if (!org) throw new Error(`Org not found: ${orgId}`);
      if (!source) throw new Error(`Source not found: ${sourceId}`);
      if (source.status === 'inactive') throw new Error(`Source is inactive: ${sourceId}`);

      return { org, source };
    });

    // Step 2 — create sync log
    const logId = await step.run('create-sync-log', async () => {
      return createSyncLog({ orgId, sourceType });
    });

    // Step 3 — decrypt credentials
    const config = await step.run('decrypt-config', async () => {
      return getDecryptedConfig(sourceId, orgId);
    });

    // Step 4 — run connector
    let syncResult: SyncResult;

    try {
      syncResult = await step.run('run-connector', async () => {
        const connector = getConnector(sourceType);
        return connector.sync({
          orgId,
          sourceId,
          config: config as ConnectorConfig,
          businessType: org.businessType ?? 'b2b',
        });
      });
    } catch (err) {
      // Step 5a — handle failure
      await step.run('handle-failure', async () => {
        const durationMs = Date.now() - startedAt;
        await Promise.all([
          failSyncLog(logId, err as Error, durationMs),
          db.update(dataSources)
            .set({
              status: 'error',
              lastSyncError: (err as Error).message,
              updatedAt: new Date(),
            })
            .where(and(
              eq(dataSources.id, sourceId),
              eq(dataSources.orgId, orgId)
            )),
        ]);
      });
      throw err; // re-throw so Inngest marks the run as failed
    }

    // Step 5b — handle success
    await step.run('handle-success', async () => {
      const durationMs = Date.now() - startedAt;
      await Promise.all([
        completeSyncLog(logId, {
          recordsUpserted: syncResult.recordsUpserted,
          fieldsUpdated: syncResult.fieldsUpdated,
          durationMs,
        }),
        db.update(dataSources)
          .set({
            status: 'active',
            lastSyncAt: new Date(),
            lastSyncError: null,
            updatedAt: new Date(),
          })
          .where(and(
            eq(dataSources.id, sourceId),
            eq(dataSources.orgId, orgId)
          )),
      ]);
    });

    return {
      orgId,
      sourceType,
      recordsUpserted: syncResult.recordsUpserted,
      fieldsUpdated: syncResult.fieldsUpdated,
    };
  }
);
