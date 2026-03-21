import { orgGuard } from '@/lib/auth';
import Link from 'next/link';
import { db } from '@/lib/db';
import { dataSources, udmFields, syncLogs, orgs } from '@/lib/db/schema';
import { and, eq, count, desc } from 'drizzle-orm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Database, Zap } from 'lucide-react';

export default async function DashboardPage() {
  const { orgId } = await orgGuard();

  const [
    org,
    [{ value: activeSources }],
    [{ value: productionFields }],
    [{ value: pendingFields }],
    recentLogs,
  ] = await Promise.all([
    db.query.orgs.findFirst({
      where: eq(orgs.id, orgId),
    }),
    db.select({ value: count() }).from(dataSources).where(
      and(eq(dataSources.orgId, orgId), eq(dataSources.status, 'active'))
    ),
    db.select({ value: count() }).from(udmFields).where(
      and(eq(udmFields.orgId, orgId), eq(udmFields.status, 'production'))
    ),
    db.select({ value: count() }).from(udmFields).where(
      and(eq(udmFields.orgId, orgId), eq(udmFields.status, 'proposed'))
    ),
    db.query.syncLogs.findMany({
      where: eq(syncLogs.orgId, orgId),
      orderBy: [desc(syncLogs.startedAt)],
      limit: 6,
    }),
  ]);

  const hasAnySources = activeSources > 0;

  return (
    <div className="space-y-8 max-w-3xl">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Data Model</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {org?.businessType
            ? `${org.businessType.toUpperCase()}${org.vertical ? ` · ${org.vertical}` : ''}`
            : 'Overview'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Link href="/settings/sources" className="group bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors duration-150">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Sources</p>
          <p className="text-3xl font-semibold tracking-tight mt-2">{activeSources}</p>
          <p className="text-xs text-muted-foreground mt-1 group-hover:text-primary transition-colors duration-150">
            Manage →
          </p>
        </Link>

        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Production Fields</p>
          <p className="text-3xl font-semibold tracking-tight mt-2">{productionFields}</p>
          <p className="text-xs text-muted-foreground mt-1">Trusted by AI agents</p>
        </div>

        <div className={`bg-card border rounded-xl p-5 transition-colors duration-150 ${
          pendingFields > 0 ? 'border-warning/40 bg-warning/5' : 'border-border'
        }`}>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending Review</p>
          <p className="text-3xl font-semibold tracking-tight mt-2">{pendingFields}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {pendingFields > 0 ? 'Fields awaiting approval' : 'Nothing to review'}
          </p>
        </div>
      </div>

      {/* Empty state — no sources */}
      {!hasAnySources && (
        <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center space-y-4">
          <div className="inline-flex size-10 items-center justify-center rounded-lg bg-muted">
            <Database className="size-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">No sources connected</p>
            <p className="text-xs text-muted-foreground mt-1">
              Connect HubSpot, Stripe, or another source to start syncing data.
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/onboarding/connect">
              Connect a source <ArrowRight className="size-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>
      )}

      {/* Recent syncs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Recent Syncs</h2>
          {recentLogs.length > 0 && (
            <span className="text-xs text-muted-foreground font-mono">last {recentLogs.length}</span>
          )}
        </div>

        {recentLogs.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-xl p-6 text-center">
            <Zap className="size-4 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No syncs yet — they run every 15 minutes once a source is connected.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
            {recentLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-foreground">{log.sourceType}</span>
                  <span className="text-xs text-muted-foreground">
                    {log.recordsUpserted ?? 0} records · {log.fieldsUpdated ?? 0} fields
                  </span>
                  {log.errorMessage && (
                    <span className="text-xs text-destructive truncate max-w-48">
                      {log.errorMessage}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {new Date(log.startedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <Badge
                    variant={
                      log.status === 'success' ? 'success'
                      : log.status === 'error' ? 'destructive'
                      : 'secondary'
                    }
                  >
                    {log.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
