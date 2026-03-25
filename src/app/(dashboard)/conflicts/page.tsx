import { orgGuard } from '@/lib/auth';
import { db } from '@/lib/db';
import { cdmConflicts } from '@/lib/db/schema';
import { and, eq, isNull, desc } from 'drizzle-orm';
import { hasRole } from '@/lib/roles';
import { ConflictsList } from '@/components/conflicts/conflicts-list';

export default async function ConflictsPage() {
  const { orgId } = await orgGuard();
  const canResolve = await hasRole('org:member');

  const openConflicts = await db.query.cdmConflicts.findMany({
    where: and(
      eq(cdmConflicts.orgId, orgId),
      isNull(cdmConflicts.resolvedAt)
    ),
    with: {
      udmRecord: {
        columns: { id: true, email: true },
      },
    },
    orderBy: [desc(cdmConflicts.createdAt)],
    limit: 100,
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Data conflicts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {openConflicts.length} unresolved conflict
          {openConflicts.length !== 1 ? 's' : ''} across your connected sources.
        </p>
      </div>
      <ConflictsList conflicts={openConflicts} canResolve={canResolve} />
    </div>
  );
}
