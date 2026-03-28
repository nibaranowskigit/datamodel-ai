import { inngest } from '../client';
import { db } from '@/lib/db';
import { dataSources, orgs, syncRuns } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { getConnector } from '@/lib/connectors/registry';
import { getDecryptedConfig } from '@/lib/connectors/config';
import { createSyncLog, completeSyncLog, failSyncLog } from '@/lib/sync/logger';
import type { ConnectorConfig, SyncResult } from '@/lib/connectors/types';
import { reconcileUDMRecords } from '@/lib/reconciliation';
import { resolveIdentities } from '@/lib/identity/resolve';
import { proposeFields } from '@/lib/ai/propose-fields';
import { notifySyncFailure } from '@/lib/notifications/notify-sync-failure';
import { notifyFieldApprovalNeeded } from '@/lib/notifications/notify-field-approval';

type SourceSyncOutcome =
  | { sourceType: string; status: 'success'; recordsUpserted: number; fieldsUpdated: number }
  | { sourceType: string; status: 'failed';  errorMessage: string };

export const syncOrgSources = inngest.createFunction(
  {
    id:       'sync-org-sources',
    name:     'Sync All Sources for Org',
    concurrency: { limit: 20 },
    retries:  2,
    triggers: [{ event: 'org/sync.requested' as const }],
  },
  async ({ event, step }) => {
    const { orgId } = event.data as { orgId: string };

    // ─── Create sync run record ───────────────────────────────────────────
    const syncRunId = await step.run('create-sync-run', async () => {
      const [run] = await db
        .insert(syncRuns)
        .values({ orgId, status: 'running' })
        .returning({ id: syncRuns.id });
      return run.id;
    });

    // ─── Fetch org + active sources ───────────────────────────────────────
    const { org, sources } = await step.run('fetch-org-and-sources', async () => {
      const [fetchedOrg, fetchedSources] = await Promise.all([
        db.query.orgs.findFirst({ where: eq(orgs.id, orgId) }),
        db.query.dataSources.findMany({
          where:   and(eq(dataSources.orgId, orgId), eq(dataSources.status, 'active')),
          columns: { id: true, sourceType: true },
        }),
      ]);

      if (!fetchedOrg) throw new Error(`Org not found: ${orgId}`);
      return { org: fetchedOrg, sources: fetchedSources };
    });

    if (sources.length === 0) {
      await step.run('mark-no-sources', async () => {
        await db
          .update(syncRuns)
          .set({ status: 'completed', completedAt: new Date() })
          .where(eq(syncRuns.id, syncRunId));
      });
      return { orgId, syncRunId, status: 'completed', sourcesTotal: 0, succeeded: 0, failed: 0 };
    }

    const businessType = org.businessType ?? 'b2b';

    // ─── Fan-out — sync all active sources in parallel ────────────────────
    // Capped at 4 concurrent sources per org (concurrency slice in Promise.allSettled).
    // Promise.allSettled ensures one failure never aborts the others.
    const syncOutcomes = await step.run('fan-out-sources', async () => {
      // Chunk sources into batches of 4 to cap per-org parallelism
      const batches: (typeof sources)[] = [];
      for (let i = 0; i < sources.length; i += 4) {
        batches.push(sources.slice(i, i + 4));
      }

      const outcomes: SourceSyncOutcome[] = [];

      for (const batch of batches) {
        const batchResults = await Promise.allSettled(
          batch.map(async (source: typeof sources[number]): Promise<SourceSyncOutcome> => {
            const startedAt = Date.now();
            const logId = await createSyncLog({
              orgId,
              sourceType: source.sourceType,
              syncRunId,
            });

            try {
              const config = await getDecryptedConfig(source.id, orgId);
              const connector = getConnector(source.sourceType);
              const result: SyncResult = await connector.sync({
                orgId,
                sourceId: source.id,
                config:   config as ConnectorConfig,
                businessType,
              });

              await Promise.all([
                completeSyncLog(logId, {
                  recordsUpserted: result.recordsUpserted,
                  fieldsUpdated:   result.fieldsUpdated,
                  durationMs:      Date.now() - startedAt,
                }),
                db
                  .update(dataSources)
                  .set({ status: 'active', lastSyncAt: new Date(), lastSyncError: null, updatedAt: new Date() })
                  .where(and(eq(dataSources.id, source.id), eq(dataSources.orgId, orgId))),
              ]);

              return {
                sourceType:      source.sourceType,
                status:          'success',
                recordsUpserted: result.recordsUpserted,
                fieldsUpdated:   result.fieldsUpdated,
              };
            } catch (err) {
              const errorMessage = (err as Error).message;

              await Promise.all([
                failSyncLog(logId, err as Error, Date.now() - startedAt),
                db
                  .update(dataSources)
                  .set({ status: 'error', lastSyncError: errorMessage, updatedAt: new Date() })
                  .where(and(eq(dataSources.id, source.id), eq(dataSources.orgId, orgId))),
                notifySyncFailure({ orgId, sourceType: source.sourceType, errorMessage, syncLogId: logId }),
              ]);

              return { sourceType: source.sourceType, status: 'failed', errorMessage };
            }
          })
        );

        for (const r of batchResults) {
          outcomes.push(r.status === 'fulfilled' ? r.value : { sourceType: 'unknown', status: 'failed', errorMessage: String(r.reason) });
        }
      }

      return outcomes;
    });

    // ─── Tally results ────────────────────────────────────────────────────
      const succeeded = syncOutcomes.filter((r: SourceSyncOutcome) => r.status === 'success').length;
    const failed    = syncOutcomes.filter((r: SourceSyncOutcome) => r.status === 'failed').length;
    const orgStatus =
      failed === 0   ? 'completed'
      : succeeded === 0 ? 'failed'
      : 'partial';

    await step.run('update-sync-run', async () => {
      await db
        .update(syncRuns)
        .set({
          status:         orgStatus,
          completedAt:    new Date(),
          sourcesTotal:   sources.length,
          sourcesSuccess: succeeded,
          sourcesFailed:  failed,
        })
        .where(eq(syncRuns.id, syncRunId));
    });

    // ─── Reconciliation + field proposals — only after ALL sources settle ─
    const proposedCount = await step.run('reconcile-and-propose', async () => {
      // 1. Reconcile — cross-source UDM record merge by email (S1.5)
      await reconcileUDMRecords(orgId);

      // 2. Identity resolution — cross-source entity matching (S1.6)
      await resolveIdentities(orgId);

      // 3. AI field proposals based on reconciled data (S2.0)
      const proposals = await proposeFields(orgId, syncRunId);

      // 4. Notify org members if new proposals are ready
      if (proposals.length > 0) {
        await notifyFieldApprovalNeeded({
          orgId,
          sourceType: 'multi',
          sourceName: 'Multi-source sync',
          fieldCount: proposals.length,
          syncRunId,
        });
      }

      return proposals.length;
    });

    return {
      orgId,
      syncRunId,
      status:         orgStatus,
      sourcesTotal:   sources.length,
      succeeded,
      failed,
      proposedFields: proposedCount,
    };
  }
);
