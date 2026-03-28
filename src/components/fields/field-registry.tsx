'use client';

import { useMemo, useState } from 'react';
import { approveField, rejectField, approveAllInNamespace } from '@/lib/actions/fields';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FieldDrawer, type FieldDrawerField } from './field-drawer';
import { cn } from '@/lib/utils';

export type RegistryFieldRow = FieldDrawerField & {
  createdAt: Date | string;
};

type Tab = 'proposed' | 'approved' | 'rejected';

const NAMESPACES = ['All', 'HS_', 'FIN_', 'SUP_', 'PROD_', 'CDM'] as const;
const DATA_TYPES = ['All', 'string', 'number', 'boolean', 'date', 'enum', 'json'] as const;

function getNamespaceFromKey(key: string): string {
  if (key.startsWith('HS_')) return 'HS_';
  if (key.startsWith('FIN_')) return 'FIN_';
  if (key.startsWith('SUP_')) return 'SUP_';
  if (key.startsWith('PROD_')) return 'PROD_';
  return 'CDM';
}

function getSourceFromKey(key: string): string {
  if (key.startsWith('HS_')) return 'HubSpot';
  if (key.startsWith('FIN_')) return 'Stripe';
  if (key.startsWith('SUP_')) return 'Intercom';
  if (key.startsWith('PROD_')) return 'Mixpanel';
  return 'Multi-source';
}

function visibleForOrg(f: RegistryFieldRow, isB2B: boolean): boolean {
  return isB2B || f.modelType !== 'cdm';
}

function parseEvidence(sourceEvidence: string | null): {
  recordCount?: number;
} | null {
  if (!sourceEvidence) return null;
  try {
    return JSON.parse(sourceEvidence) as { recordCount?: number };
  } catch {
    return null;
  }
}

export function FieldRegistry({
  proposed,
  approved,
  rejected,
  canMutate,
  isAdmin,
  isB2B,
}: {
  proposed: RegistryFieldRow[];
  approved: RegistryFieldRow[];
  rejected: RegistryFieldRow[];
  canMutate: boolean;
  isAdmin: boolean;
  isB2B: boolean;
}) {
  const [tab, setTab] = useState<Tab>('proposed');
  const [namespace, setNs] = useState<string>('All');
  const [dataType, setDt] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [drawerField, setDrawer] = useState<RegistryFieldRow | null>(null);
  const [loadingId, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const allFields: Record<Tab, RegistryFieldRow[]> = { proposed, approved, rejected };
  const currentFields = allFields[tab];

  const filtered = useMemo(() => {
    return currentFields.filter((f) => {
      if (!visibleForOrg(f, isB2B)) return false;
      const ns = f.modelType === 'cdm' ? 'CDM' : getNamespaceFromKey(f.fieldKey);
      if (namespace !== 'All' && ns !== namespace) return false;
      if (dataType !== 'All' && f.dataType !== dataType) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          f.fieldKey.toLowerCase().includes(q) ||
          f.label.toLowerCase().includes(q) ||
          (f.description?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [currentFields, namespace, dataType, search, isB2B]);

  async function handleApprove(field: RegistryFieldRow): Promise<boolean> {
    setLoading(field.id);
    setError('');
    try {
      await approveField(field.id);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setLoading(null);
    }
  }

  async function handleReject(field: RegistryFieldRow): Promise<boolean> {
    setLoading(field.id);
    setError('');
    try {
      await rejectField(field.id);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setLoading(null);
    }
  }

  async function handleApproveAll(ns: string) {
    if (ns === 'All') return;
    setError('');
    try {
      await approveAllInNamespace(ns);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const tabCounts = useMemo(() => {
    const countVisible = (rows: RegistryFieldRow[]) =>
      rows.filter((f) => visibleForOrg(f, isB2B)).length;
    return {
      proposed: countVisible(proposed),
      approved: countVisible(approved),
      rejected: countVisible(rejected),
    };
  }, [proposed, approved, rejected, isB2B]);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'proposed', label: 'Proposed', count: tabCounts.proposed },
    { key: 'approved', label: 'Approved', count: tabCounts.approved },
    { key: 'rejected', label: 'Rejected', count: tabCounts.rejected },
  ];

  return (
    <>
      {drawerField ? (
        <FieldDrawer
          field={drawerField}
          onClose={() => setDrawer(null)}
          canMutate={canMutate}
          isAdmin={isAdmin}
          onApprove={async () => {
            const ok = await handleApprove(drawerField);
            if (ok) setDrawer(null);
          }}
          onReject={async () => {
            const ok = await handleReject(drawerField);
            if (ok) setDrawer(null);
          }}
        />
      ) : null}

      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors duration-150 ease',
              'border-b-2 -mb-px',
              tab === t.key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
            <span
              className={cn(
                'ml-2 text-xs px-1.5 py-0.5 rounded-full',
                tab === t.key ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
              )}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      <div className="flex gap-3 items-center flex-wrap">
        <Input
          placeholder="Search fields…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-56 text-sm bg-transparent border-input"
        />
        <Select value={namespace} onValueChange={setNs}>
          <SelectTrigger className="h-9 w-36 text-sm bg-transparent border-input">
            <SelectValue placeholder="Namespace" />
          </SelectTrigger>
          <SelectContent>
            {NAMESPACES.filter((n) => isB2B || n !== 'CDM').map((n) => (
              <SelectItem key={n} value={n}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dataType} onValueChange={setDt}>
          <SelectTrigger className="h-9 w-32 text-sm bg-transparent border-input">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {DATA_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {canMutate && tab === 'proposed' && namespace !== 'All' ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 text-xs ml-auto"
            onClick={() => void handleApproveAll(namespace)}
          >
            Approve all {namespace}
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {filtered.length === 0 ? (
        <div className="py-12 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            {tab === 'proposed'
              ? 'No proposed fields. Run a sync to generate proposals.'
              : `No ${tab} fields.`}
          </p>
        </div>
      ) : (
        <Card className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {filtered.map((field) => {
            const isLoading = loadingId === field.id;
            const evidence = parseEvidence(field.sourceEvidence);

            return (
              <div
                key={field.id}
                className={cn(
                  'flex items-center justify-between px-4 py-3',
                  'hover:bg-muted/30 transition-colors duration-150 ease cursor-pointer',
                )}
                onClick={() => setDrawer(field)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setDrawer(field);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-xs font-mono text-foreground">{field.fieldKey}</code>
                    <span className="text-xs px-1.5 py-0.5 rounded-md border border-border bg-muted text-muted-foreground font-medium">
                      {field.dataType}
                    </span>
                    {field.modelType === 'cdm' ? (
                      <Badge variant="outline" className="text-xs">
                        CDM
                      </Badge>
                    ) : null}
                    {field.confidence !== null && field.confidence !== undefined && field.confidence < 0.7 ? (
                      <Badge variant="warning" className="text-xs">
                        Low confidence
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-sm text-muted-foreground truncate">{field.label}</p>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {getSourceFromKey(field.fieldKey)}
                    </span>
                    {evidence?.recordCount != null ? (
                      <span className="text-xs text-muted-foreground hidden md:inline tabular-nums">
                        {evidence.recordCount} records
                      </span>
                    ) : null}
                  </div>
                </div>

                <div
                  className="flex items-center gap-2 shrink-0 ml-4"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  {canMutate && field.status === 'proposed' ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        disabled={isLoading}
                        onClick={() => void handleApprove(field)}
                        className="h-9 px-3 text-xs"
                      >
                        {isLoading ? '…' : 'Approve'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isLoading}
                        onClick={() => void handleReject(field)}
                        className="h-9 px-2 text-xs text-muted-foreground hover:text-destructive"
                      >
                        Reject
                      </Button>
                    </>
                  ) : null}
                  {field.status === 'approved' ? (
                    <Badge variant="success" className="text-xs">
                      Approved
                    </Badge>
                  ) : null}
                  {field.status === 'rejected' ? (
                    <Badge variant="secondary" className="text-xs">
                      Rejected
                    </Badge>
                  ) : null}
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </>
  );
}
