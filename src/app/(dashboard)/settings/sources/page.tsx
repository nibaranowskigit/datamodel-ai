import { orgGuard } from '@/lib/auth';
import { db } from '@/lib/db';
import { dataSources } from '@/lib/db/schema';
import { and, eq, ne } from 'drizzle-orm';
import { Badge } from '@/components/ui/badge';
import { DisconnectSourceButton } from '@/components/settings/disconnect-source-button';

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending:  { label: 'Pending',  variant: 'secondary' },
  active:   { label: 'Active',   variant: 'default' },
  error:    { label: 'Error',    variant: 'destructive' },
  inactive: { label: 'Inactive', variant: 'outline' },
};

export default async function SourcesPage() {
  const { orgId } = await orgGuard();

  const sources = await db.query.dataSources.findMany({
    where: and(
      eq(dataSources.orgId, orgId),
      ne(dataSources.status, 'inactive')
    ),
    columns: { connectionConfig: false },
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">Connected Sources</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your data source connections.
        </p>
      </div>

      {sources.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">No sources connected yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Connect a source during{' '}
            <a href="/onboarding/connect" className="underline underline-offset-4">
              onboarding
            </a>
            .
          </p>
        </div>
      ) : (
        <div className="rounded-lg border divide-y">
          {sources.map((source) => {
            const status = STATUS_LABELS[source.status] ?? STATUS_LABELS.pending;
            return (
              <div key={source.id} className="flex items-center justify-between px-4 py-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{source.displayName}</span>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {source.lastSyncAt
                      ? `Last synced ${new Date(source.lastSyncAt).toLocaleDateString()}`
                      : 'Never synced'}
                    {source.lastSyncError && (
                      <span className="text-destructive ml-2">— {source.lastSyncError}</span>
                    )}
                  </p>
                </div>
                <DisconnectSourceButton sourceId={source.id} sourceName={source.displayName} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
