import Link from 'next/link';
import { orgGuard } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { db } from '@/lib/db';
import { reconciliationRules } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import {
  RECONCILIATION_NAMESPACES,
  RECONCILIATION_SOURCE_TYPES,
  type ReconciliationNamespace,
} from '@/lib/reconciliation/constants';
import { ReconciliationRulesForm } from '@/components/settings/reconciliation-rules-form';

function defaultPrioritiesForNamespace(ns: ReconciliationNamespace): Record<string, number> {
  const row = {
    HS_:   { hubspot: 1, stripe: 2, intercom: 3, mixpanel: 4 },
    FIN_:  { stripe: 1, hubspot: 2, intercom: 3, mixpanel: 4 },
    SUP_:  { intercom: 1, hubspot: 2, stripe: 3, mixpanel: 4 },
    PROD_: { mixpanel: 1, hubspot: 2, stripe: 3, intercom: 4 },
  } as const;
  return { ...row[ns] };
}

export default async function ReconciliationSettingsPage() {
  const { orgId } = await orgGuard();
  const isAdmin = await hasRole('org:admin');

  const rows = await db.query.reconciliationRules.findMany({
    where: eq(reconciliationRules.orgId, orgId),
    columns: { namespace: true, sourceType: true, priority: true },
    orderBy: [asc(reconciliationRules.namespace), asc(reconciliationRules.priority)],
  });

  const initialByNamespace = {} as Record<ReconciliationNamespace, Record<string, number>>;
  for (const ns of RECONCILIATION_NAMESPACES) {
    initialByNamespace[ns] = defaultPrioritiesForNamespace(ns);
  }
  for (const r of rows) {
    if (
      (RECONCILIATION_NAMESPACES as readonly string[]).includes(r.namespace) &&
      (RECONCILIATION_SOURCE_TYPES as readonly string[]).includes(r.sourceType)
    ) {
      const ns = r.namespace as ReconciliationNamespace;
      initialByNamespace[ns][r.sourceType] = r.priority;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Reconciliation</h2>
        <p className="text-sm text-muted-foreground mt-1">
          When the same person exists in multiple sources, we merge field values using these
          priorities. Conflicting values still appear on{' '}
          <Link href="/conflicts" className="text-primary hover:underline">
            Data conflicts
          </Link>{' '}
          for review.
        </p>
      </div>

      <ReconciliationRulesForm initialByNamespace={initialByNamespace} isAdmin={isAdmin} />

      {!isAdmin && (
        <p className="text-xs text-muted-foreground">
          Only workspace admins can change master source order.
        </p>
      )}
    </div>
  );
}
