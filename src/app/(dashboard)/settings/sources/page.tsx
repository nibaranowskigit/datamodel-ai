import { orgGuard } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { db } from '@/lib/db';
import { dataSources, syncLogs } from '@/lib/db/schema';
import { and, eq, not, desc } from 'drizzle-orm';
import { SourcesList } from '@/components/settings/sources-list';

export default async function SourcesPage() {
  const { orgId } = await orgGuard();
  const isAdmin = await hasRole('org:admin');

  const sources = await db.query.dataSources.findMany({
    where: and(
      eq(dataSources.orgId, orgId),
      not(eq(dataSources.status, 'inactive'))
    ),
    orderBy: [desc(dataSources.createdAt)],
    columns: {
      connectionConfig: false, // never expose encrypted creds to client
    },
  });

  const recentLogs = await db.query.syncLogs.findMany({
    where: eq(syncLogs.orgId, orgId),
    orderBy: [desc(syncLogs.startedAt)],
    limit: Math.max(sources.length * 3, 1),
  });

  // Keep only the latest log per sourceType
  const latestLogBySource = new Map<string, typeof recentLogs[0]>();
  for (const log of recentLogs) {
    if (!latestLogBySource.has(log.sourceType)) {
      latestLogBySource.set(log.sourceType, log);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Connected sources</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your data source connections and sync status.
        </p>
      </div>

      <SourcesList
        sources={sources}
        latestLogs={Object.fromEntries(latestLogBySource)}
        isAdmin={isAdmin}
      />
    </div>
  );
}
