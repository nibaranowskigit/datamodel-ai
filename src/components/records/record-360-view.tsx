'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

export type FieldDef = {
  fieldKey: string;
  label: string;
  dataType: string;
  description: string | null;
};

const NAMESPACES = [
  { prefix: 'HS_', label: 'CRM', source: 'HubSpot' },
  { prefix: 'FIN_', label: 'Finance', source: 'Stripe' },
  { prefix: 'SUP_', label: 'Support', source: 'Intercom' },
  { prefix: 'PROD_', label: 'Product', source: 'Mixpanel' },
] as const;

const SOURCE_LABEL: Record<string, string> = {
  hubspot: 'HubSpot',
  stripe: 'Stripe',
  intercom: 'Intercom',
  mixpanel: 'Mixpanel',
  reconciled: 'Reconciled',
};

function formatValue(value: unknown, dataType: string): string {
  if (value === null || value === undefined) return '—';
  if (dataType === 'date') {
    const d = new Date(value as string);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  if (dataType === 'number') {
    const n = Number(value);
    return Number.isNaN(n) ? String(value) : n.toLocaleString();
  }
  if (dataType === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  return String(value);
}

function isPopulated(value: unknown): boolean {
  return value !== null && value !== undefined && value !== '';
}

function truncateDisplay(s: string, max = 80): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

function FieldRow({
  fieldKey,
  def,
  value,
  sourceType,
}: {
  fieldKey: string;
  def: FieldDef | undefined;
  value: unknown;
  sourceType?: string;
}) {
  const empty = !isPopulated(value);
  const raw = empty ? '' : formatValue(value, def?.dataType ?? 'string');
  const display = empty ? 'empty' : truncateDisplay(raw);
  const sourceLabel =
    sourceType != null && sourceType !== ''
      ? SOURCE_LABEL[sourceType] ?? sourceType
      : null;

  return (
    <div className="flex items-start justify-between py-2.5 border-b border-border last:border-0 gap-4">
      <div className="min-w-0 space-y-0.5 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs text-muted-foreground">{def?.label ?? fieldKey}</p>
          {sourceLabel != null && (
            <span className="text-xs px-1.5 py-0.5 rounded border bg-muted/50 text-muted-foreground border-border font-medium">
              {sourceLabel}
            </span>
          )}
        </div>
        <code className="text-xs font-mono text-muted-foreground/70">{fieldKey}</code>
      </div>
      <p
        title={empty ? undefined : raw.length > 80 ? raw : undefined}
        className={cn(
          'text-sm text-right shrink-0 max-w-[min(100%,18rem)] break-words',
          empty ? 'text-muted-foreground/50 italic' : 'text-foreground font-medium',
        )}
      >
        {display}
      </p>
    </div>
  );
}

export function Record360View({
  record,
  fieldDefMap,
  fieldSources,
}: {
  record: {
    id: string;
    email: string | null;
    aliasOfId: string | null;
    fields: Record<string, unknown>;
  };
  fieldDefMap: Record<string, FieldDef>;
  fieldSources: Record<string, string>;
}) {
  const fields = record.fields ?? {};
  const approvedKeys = Object.keys(fieldDefMap);
  const populatedKeys = approvedKeys.filter((k) => isPopulated(fields[k]));
  const completeness =
    approvedKeys.length > 0
      ? Math.round((populatedKeys.length / approvedKeys.length) * 100)
      : null;

  const otherKeys = approvedKeys.filter(
    (k) => !NAMESPACES.some(({ prefix }) => k.startsWith(prefix)),
  );

  return (
    <div className="space-y-6">
      {record.aliasOfId != null && (
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          This row is a merged alias. Canonical data may live on the primary record.
        </div>
      )}

      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-lg font-medium text-primary uppercase">
            {(record.email ?? '?').slice(0, 2)}
          </span>
        </div>
        <div className="space-y-1 min-w-0">
          <h2 className="text-lg font-semibold tracking-tight truncate">
            {record.email ?? 'Unknown'}
          </h2>
          {isPopulated(fields.HS_company) && (
            <p className="text-sm text-muted-foreground">{String(fields.HS_company)}</p>
          )}
          {completeness !== null && (
            <div className="flex items-center gap-2 pt-1">
              <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${completeness}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {completeness}% complete
              </span>
            </div>
          )}
        </div>
      </div>

      {NAMESPACES.map(({ prefix, label, source }) => {
        const nsFields = approvedKeys.filter((k) => k.startsWith(prefix));
        if (nsFields.length === 0) return null;

        const visibleFields = nsFields.filter((k) => fieldDefMap[k] != null);
        if (visibleFields.length === 0) return null;

        const populatedInNs = visibleFields.filter((k) => isPopulated(fields[k])).length;

        return (
          <div key={prefix} className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold tracking-tight">{label}</h3>
              <span className="text-xs text-muted-foreground">· {source}</span>
              <span className="text-xs text-muted-foreground ml-auto tabular-nums">
                {populatedInNs} / {visibleFields.length} populated
              </span>
            </div>
            <div className="border border-border rounded-xl overflow-hidden bg-card px-4">
              {visibleFields.map((k) => (
                <FieldRow
                  key={k}
                  fieldKey={k}
                  def={fieldDefMap[k]}
                  value={fields[k]}
                  sourceType={fieldSources[k]}
                />
              ))}
            </div>
          </div>
        );
      })}

      {otherKeys.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold tracking-tight">Other</h3>
            <span className="text-xs text-muted-foreground ml-auto tabular-nums">
              {otherKeys.filter((k) => isPopulated(fields[k])).length} / {otherKeys.length}{' '}
              populated
            </span>
          </div>
          <div className="border border-border rounded-xl overflow-hidden bg-card px-4">
            {otherKeys.map((k) => (
              <FieldRow
                key={k}
                fieldKey={k}
                def={fieldDefMap[k]}
                value={fields[k]}
                sourceType={fieldSources[k]}
              />
            ))}
          </div>
        </div>
      )}

      {approvedKeys.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No approved fields yet.{' '}
          <Link href="/fields" className="text-primary hover:underline">
            Approve fields
          </Link>{' '}
          to see them here.
        </p>
      )}
    </div>
  );
}
