'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type FieldDrawerField = {
  id: string;
  fieldKey: string;
  label: string;
  dataType: string;
  status: string;
  modelType: string;
  confidence: number | null;
  sourceEvidence: string | null;
  description: string | null;
  rationale: string | null;
  approvedBy: string | null;
  approvedAt: Date | string | null;
  rejectedBy: string | null;
  rejectedAt: Date | string | null;
};

export function FieldDrawer({
  field,
  onClose,
  canMutate,
  isAdmin,
  onApprove,
  onReject,
}: {
  field: FieldDrawerField;
  onClose: () => void;
  canMutate: boolean;
  isAdmin: boolean;
  onApprove: () => void | Promise<void>;
  onReject: () => void | Promise<void>;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  type EvidencePayload = {
    recordCount?: number;
    sourceType?: string;
    sampleValues?: string[];
  };

  let evidence: EvidencePayload | null = null;
  if (field.sourceEvidence) {
    try {
      evidence = JSON.parse(field.sourceEvidence) as EvidencePayload;
    } catch {
      evidence = null;
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-background/60 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={cn(
          'fixed right-0 top-0 h-full w-full max-w-md z-50',
          'bg-card border-l border-border',
          'overflow-y-auto',
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="field-drawer-title"
      >
        <div className="p-6 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <code className="text-sm font-mono text-foreground break-all">
                {field.fieldKey}
              </code>
              <p id="field-drawer-title" className="text-base font-semibold tracking-tight">
                {field.label}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Data type', value: field.dataType },
              { label: 'Model', value: field.modelType?.toUpperCase() ?? 'UDM' },
              { label: 'Status', value: field.status },
              {
                label: 'Confidence',
                value:
                  field.confidence !== null && field.confidence !== undefined
                    ? `${Math.round(field.confidence * 100)}%`
                    : '—',
              },
            ].map((item) => (
              <div key={item.label} className="space-y-0.5">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-sm font-medium">{item.value}</p>
              </div>
            ))}
          </div>

          {field.description ? (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Description
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">{field.description}</p>
            </div>
          ) : null}

          {field.rationale ? (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Why this field?
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground italic">
                &ldquo;{field.rationale}&rdquo;
              </p>
            </div>
          ) : null}

          {evidence ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Evidence
              </p>
              <div className="bg-muted rounded-xl border border-border p-4 space-y-2">
                <p className="text-xs text-muted-foreground">
                  {evidence.recordCount != null
                    ? `Found in ${evidence.recordCount} records`
                    : 'Source evidence'}
                  {evidence.sourceType ? ` · source: ${evidence.sourceType}` : ''}
                </p>
                {evidence.sampleValues && evidence.sampleValues.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {evidence.sampleValues.map((v, i) => (
                      <code
                        key={i}
                        className="text-xs font-mono bg-background px-2 py-0.5 rounded-md border border-border"
                      >
                        {v}
                      </code>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {isAdmin && (field.approvedAt || field.rejectedAt) ? (
            <div className="space-y-2 border-t border-border pt-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Audit
              </p>
              {field.approvedAt ? (
                <p className="text-sm text-muted-foreground">
                  Approved
                  {field.approvedBy ? ` by ${field.approvedBy}` : ''}{' '}
                  {new Date(field.approvedAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              ) : null}
              {field.rejectedAt ? (
                <p className="text-sm text-muted-foreground">
                  Rejected
                  {field.rejectedBy ? ` by ${field.rejectedBy}` : ''}{' '}
                  {new Date(field.rejectedAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              ) : null}
            </div>
          ) : field.approvedAt && !isAdmin ? (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Approved
              </p>
              <p className="text-sm text-muted-foreground">
                {new Date(field.approvedAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          ) : null}

          {canMutate && field.status === 'proposed' ? (
            <div className="flex gap-3 pt-2 border-t border-border">
              <Button type="button" size="sm" className="flex-1 h-9" onClick={() => void onApprove()}>
                Approve field
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 h-9 text-destructive border-destructive/30"
                onClick={() => void onReject()}
              >
                Reject
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
