import { orgGuard } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import {
  getPendingAiFieldProposals,
  getAllUdmFields,
} from '@/lib/fields/queries';
import { AiProposalsList } from '@/components/fields/ai-proposals-list';
import { ApproveRegistryFieldButton } from '@/components/fields/approve-registry-field-button';
import { Badge } from '@/components/ui/badge';

export default async function DataModelFieldsPage() {
  const { orgId } = await orgGuard();
  const canAct = await hasRole('org:member');

  const [aiProposals, registry] = await Promise.all([
    getPendingAiFieldProposals(orgId),
    getAllUdmFields(orgId),
  ]);

  const production = registry.filter((f) => f.status === 'production');
  const manualProposed = registry.filter((f) => f.status === 'proposed');

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Fields</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Approve AI-proposed fields from sync, and review your registry.
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Proposed by AI</h2>
          {aiProposals.length > 0 && (
            <Badge variant="secondary" className="text-xs tabular-nums">
              {aiProposals.length}
            </Badge>
          )}
        </div>
        <AiProposalsList proposals={aiProposals} canAct={canAct} />
      </section>

      {manualProposed.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Manually proposed (registry)</h2>
          <p className="text-xs text-muted-foreground">
            Manually created proposals in <span className="font-mono">udm_fields</span> (e.g. from settings).
          </p>
          <ul className="border border-border rounded-xl divide-y divide-border bg-card">
            {manualProposed.map((f) => (
              <li
                key={f.id}
                className="px-4 py-3 flex flex-wrap gap-3 items-center justify-between"
              >
                <div className="flex flex-wrap gap-2 items-baseline min-w-0">
                  <span className="font-mono text-sm">{f.fieldKey}</span>
                  <span className="text-sm text-muted-foreground">{f.displayName}</span>
                </div>
                {canAct && <ApproveRegistryFieldButton fieldId={f.id} />}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Production registry</h2>
        {production.length === 0 ? (
          <p className="text-sm text-muted-foreground">No production fields yet.</p>
        ) : (
          <ul className="border border-border rounded-xl divide-y divide-border bg-card">
            {production.map((f) => (
              <li key={f.id} className="px-4 py-3 flex flex-wrap gap-2 items-baseline justify-between">
                <div className="flex flex-wrap gap-2 items-baseline min-w-0">
                  <span className="font-mono text-sm">{f.fieldKey}</span>
                  <span className="text-sm text-muted-foreground">{f.displayName}</span>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">
                  {f.typology}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
