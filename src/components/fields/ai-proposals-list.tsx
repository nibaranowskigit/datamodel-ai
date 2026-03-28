'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { approveAiFieldProposal, rejectAiFieldProposal } from '@/lib/actions/fields';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ProposedField } from '@/lib/db/schema';

type Row = Pick<
  ProposedField,
  | 'id'
  | 'fieldKey'
  | 'label'
  | 'dataType'
  | 'description'
  | 'confidence'
  | 'rationale'
  | 'sourceEvidence'
  | 'modelType'
>;

function parseEvidence(raw: string): { sampleValues: string[]; recordCount: number; sourceType: string } {
  try {
    const o = JSON.parse(raw) as {
      sampleValues?: string[];
      recordCount?: number;
      sourceType?: string;
    };
    return {
      sampleValues: o.sampleValues ?? [],
      recordCount:  typeof o.recordCount === 'number' ? o.recordCount : 0,
      sourceType:   o.sourceType ?? '—',
    };
  } catch {
    return { sampleValues: [], recordCount: 0, sourceType: '—' };
  }
}

export function AiProposalsList({ proposals, canAct }: { proposals: Row[]; canAct: boolean }) {
  const [pending, startTransition] = useTransition();

  if (proposals.length === 0) {
    return (
      <p className="text-sm text-muted-foreground border border-dashed border-border rounded-xl p-6 text-center">
        No AI proposals in the queue. They appear here after a multi-source sync finds new field signals.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {proposals.map((p) => {
        const ev = parseEvidence(p.sourceEvidence);
        return (
          <li
            key={p.id}
            className="bg-card border border-border rounded-xl p-5 space-y-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-medium text-foreground">{p.fieldKey}</span>
                  <Badge variant="secondary" className="text-xs font-normal">
                    {p.dataType}
                  </Badge>
                  <Badge variant="outline" className="text-xs font-normal">
                    {p.modelType === 'cdm' ? 'CDM' : 'UDM'}
                  </Badge>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    confidence {(p.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-sm font-medium tracking-tight">{p.label}</p>
                <p className="text-sm text-muted-foreground">{p.description}</p>
              </div>
              {canAct && (
                <div className="flex gap-2 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        try {
                          await rejectAiFieldProposal(p.id);
                          toast.success('Proposal dismissed');
                        } catch (e) {
                          toast.error((e as Error).message);
                        }
                      });
                    }}
                  >
                    Reject
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-9"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        try {
                          await approveAiFieldProposal(p.id);
                          toast.success('Field approved to production');
                        } catch (e) {
                          toast.error((e as Error).message);
                        }
                      });
                    }}
                  >
                    Approve
                  </Button>
                </div>
              )}
            </div>
            <div className="text-xs text-muted-foreground space-y-1 border-t border-border pt-3">
              <p>
                <span className="text-foreground/80">Evidence</span>
                {' · '}
                {ev.recordCount} records · {ev.sourceType}
              </p>
              {ev.sampleValues.length > 0 && (
                <p className="font-mono text-foreground/90">
                  {ev.sampleValues.slice(0, 5).join(' · ')}
                </p>
              )}
              <p className="text-foreground/80">{p.rationale}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
