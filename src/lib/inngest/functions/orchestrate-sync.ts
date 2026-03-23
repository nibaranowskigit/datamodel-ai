import { inngest } from '../client';
import { db } from '@/lib/db';
import { dataSources } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { syncOrgSources } from './sync-org-sources';

export const orchestrateSync = inngest.createFunction(
  {
    id:       'orchestrate-sync',
    name:     'Orchestrate Multi-Source Sync',
    concurrency: { limit: 10 },
    triggers: [{ cron: '0 */6 * * *' }],
  },
  async ({ step }) => {
    // Find every org that has at least one active source
    const activeOrgIds = await step.run('fetch-active-orgs', async () => {
      const sources = await db.query.dataSources.findMany({
        where:   eq(dataSources.status, 'active'),
        columns: { orgId: true },
      });
      return [...new Set(sources.map((s) => s.orgId))];
    });

    if (activeOrgIds.length === 0) {
      return { orgsTriggered: 0 };
    }

    // Fan-out — invoke syncOrgSources once per org in parallel.
    // step.invoke dispatches to the registered syncOrgSources function and
    // waits for each to complete before the orchestrator itself resolves.
    await Promise.all(
      activeOrgIds.map((orgId: string) =>
        step.invoke(`sync-org-${orgId}`, {
          function: syncOrgSources,
          data:     { orgId },
        })
      )
    );

    return { orgsTriggered: activeOrgIds.length };
  }
);
