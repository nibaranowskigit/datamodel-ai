'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { SOURCE_META } from '@/lib/connectors/source-fields';
import {
  RECONCILIATION_NAMESPACES,
  RECONCILIATION_SOURCE_TYPES,
  type ReconciliationNamespace,
} from '@/lib/reconciliation/constants';
import { updateReconciliationPriorities } from '@/lib/actions/reconciliation-rules';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const NAMESPACE_LABEL: Record<ReconciliationNamespace, string> = {
  HS_: 'CRM fields (HS_*)',
  FIN_: 'Finance (FIN_*)',
  SUP_: 'Support (SUP_*)',
  PROD_: 'Product analytics (PROD_*)',
};

function clonePriorities(
  src: Record<ReconciliationNamespace, Record<string, number>>
): Record<ReconciliationNamespace, Record<string, number>> {
  const out = {} as Record<ReconciliationNamespace, Record<string, number>>;
  for (const ns of RECONCILIATION_NAMESPACES) {
    out[ns] = { ...src[ns] };
  }
  return out;
}

function ranksValid(p: Record<string, number>): boolean {
  const ranks = Object.values(p);
  if (ranks.length !== 4) return false;
  const sorted = [...ranks].sort((a, b) => a - b);
  return sorted[0] === 1 && sorted[1] === 2 && sorted[2] === 3 && sorted[3] === 4;
}

type Props = {
  initialByNamespace: Record<ReconciliationNamespace, Record<string, number>>;
  isAdmin: boolean;
};

export function ReconciliationRulesForm({ initialByNamespace, isAdmin }: Props) {
  const router = useRouter();
  const [priorities, setPriorities] = useState(() => clonePriorities(initialByNamespace));
  const [error, setError] = useState<string | null>(null);
  const [pendingNs, setPendingNs] = useState<ReconciliationNamespace | null>(null);
  const [isPending, startTransition] = useTransition();

  const prioritiesServerKey = useMemo(
    () => JSON.stringify(initialByNamespace),
    [initialByNamespace]
  );

  useEffect(() => {
    setPriorities(clonePriorities(initialByNamespace));
    // Serialized key only: same data + new RSC object reference must not wipe unsaved edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialByNamespace matches prioritiesServerKey step
  }, [prioritiesServerKey]);

  function setRank(ns: ReconciliationNamespace, sourceType: string, rank: string) {
    const n = Number(rank);
    if (!Number.isFinite(n)) return;
    setPriorities((prev) => ({
      ...prev,
      [ns]: { ...prev[ns], [sourceType]: n },
    }));
    setError(null);
  }

  function saveNamespace(ns: ReconciliationNamespace) {
    const p = priorities[ns];
    if (!ranksValid(p)) {
      setError('Each source needs a unique rank from 1 (highest) to 4.');
      return;
    }
    setError(null);
    setPendingNs(ns);
    startTransition(async () => {
      try {
        await updateReconciliationPriorities(ns, p);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setPendingNs(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {RECONCILIATION_NAMESPACES.map((ns) => (
          <Card key={ns} className="rounded-xl border border-border p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">{NAMESPACE_LABEL[ns]}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Rank 1 wins when sources disagree on a field in this namespace. Lower number = higher
                priority.
              </p>
            </div>

            {!isAdmin ? (
              <ol className="list-decimal list-inside space-y-1.5 text-sm text-foreground">
                {[...RECONCILIATION_SOURCE_TYPES]
                  .sort((a, b) => priorities[ns][a] - priorities[ns][b])
                  .map((st) => (
                  <li key={st}>
                    <span className="font-medium">{SOURCE_META[st]?.label ?? st}</span>
                    <span className="text-muted-foreground font-mono text-xs ml-2">
                      priority {priorities[ns][st]}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="space-y-3">
                {RECONCILIATION_SOURCE_TYPES.map((st) => (
                  <div key={st} className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <Label className="text-xs">{SOURCE_META[st]?.label ?? st}</Label>
                      <p className="text-xs text-muted-foreground font-mono truncate">{st}</p>
                    </div>
                    <div className="space-y-1.5 shrink-0">
                      <Label className="text-xs invisible" aria-hidden="true">
                        ‎
                      </Label>
                      <Select
                        value={String(priorities[ns][st])}
                        onValueChange={(v) => setRank(ns, st, v)}
                      >
                        <SelectTrigger className="h-9 w-full sm:w-36">
                          <SelectValue placeholder="Rank" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4].map((r) => (
                            <SelectItem key={r} value={String(r)}>
                              {r === 1 ? '1 — master' : String(r)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}

                <div className="pt-2">
                  <Button
                    type="button"
                    size="sm"
                    className="h-9"
                    disabled={isPending}
                    onClick={() => saveNamespace(ns)}
                  >
                    {pendingNs === ns && isPending ? 'Saving…' : `Save ${NAMESPACE_LABEL[ns].split(' ')[0]}`}
                  </Button>
                </div>
              </div>
            )}
          </Card>
      ))}
    </div>
  );
}
