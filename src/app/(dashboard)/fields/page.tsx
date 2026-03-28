import { orgGuard } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { db } from '@/lib/db';
import { proposedFields, orgs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { FieldRegistry, type RegistryFieldRow } from '@/components/fields/field-registry';

export default async function FieldsPage() {
  const { orgId } = await orgGuard();
  const [canMutate, isAdmin] = await Promise.all([
    hasRole('org:member'),
    hasRole('org:admin'),
  ]);

  const org = await db.query.orgs.findFirst({
    where: eq(orgs.id, orgId),
    columns: { businessType: true },
  });

  const rows = await db.query.proposedFields.findMany({
    where: eq(proposedFields.orgId, orgId),
    orderBy: (t, { desc: d }) => [d(t.createdAt)],
  });

  const toRow = (f: (typeof rows)[number]): RegistryFieldRow => ({
    id: f.id,
    fieldKey: f.fieldKey,
    label: f.label,
    dataType: f.dataType,
    status: f.status,
    modelType: f.modelType,
    confidence: f.confidence,
    sourceEvidence: f.sourceEvidence,
    description: f.description,
    rationale: f.rationale,
    approvedBy: f.approvedBy,
    approvedAt: f.approvedAt,
    rejectedBy: f.rejectedBy,
    rejectedAt: f.rejectedAt,
    createdAt: f.createdAt,
  });

  const mapped = rows.map(toRow);
  const proposed = mapped.filter((f) => f.status === 'proposed');
  const approved = mapped.filter((f) => f.status === 'approved');
  const rejected = mapped.filter((f) => f.status === 'rejected');
  const isB2B = org?.businessType === 'b2b';

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Field registry</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage the fields available to your data model and AI agents.
        </p>
      </div>

      <FieldRegistry
        proposed={proposed}
        approved={approved}
        rejected={rejected}
        canMutate={canMutate}
        isAdmin={isAdmin}
        isB2B={isB2B}
      />
    </div>
  );
}
