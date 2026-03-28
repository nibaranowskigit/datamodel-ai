import { orgGuard } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { db } from '@/lib/db';
import { identityReviewQueue, udmRecords } from '@/lib/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { IdentityReviewList } from '@/components/identity/identity-review-list';

export default async function IdentityPage() {
  const { orgId } = await orgGuard();
  const canResolve = await hasRole('org:member');

  const pending = await db.query.identityReviewQueue.findMany({
    where: and(
      eq(identityReviewQueue.orgId, orgId),
      eq(identityReviewQueue.status, 'pending'),
    ),
    orderBy: (t, { desc }) => [desc(t.confidence)],
    limit: 50,
  });

  const recordIds = [...new Set(pending.flatMap((p) => [p.recordIdA, p.recordIdB]))];

  const records =
    recordIds.length === 0
      ? []
      : await db.query.udmRecords.findMany({
          where: and(eq(udmRecords.orgId, orgId), inArray(udmRecords.id, recordIds)),
          columns: { id: true, email: true, data: true },
          with: {
            fieldValues: {
              columns: { fieldKey: true, value: true, sourceType: true },
            },
          },
        });

  const recordMap = Object.fromEntries(
    records.map((r) => {
      const sources = [
        ...new Set(
          r.fieldValues.map((fv) => fv.sourceType).filter((s) => s !== 'reconciled'),
        ),
      ];
      return [
        r.id,
        {
          id: r.id,
          email: r.email,
          sourceLabels: sources,
          data: r.data as Record<string, unknown> | null,
        },
      ];
    }),
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Identity resolution</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {pending.length} potential duplicate
          {pending.length !== 1 ? 's' : ''} found across your sources. Review and confirm to
          merge.
        </p>
      </div>
      <IdentityReviewList items={pending} recordMap={recordMap} canResolve={canResolve} />
    </div>
  );
}
