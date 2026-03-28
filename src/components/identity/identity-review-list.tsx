'use client';

import { useState, useTransition } from 'react';
import type { IdentityReviewItem } from '@/lib/db/schema';
import { acceptIdentityMatch, rejectIdentityMatch } from '@/lib/actions/identity';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

type RecordPreview = {
  id: string;
  email: string | null;
  sourceLabels: string[];
  data: Record<string, unknown> | null;
};

function formatSnippet(data: Record<string, unknown> | null): string {
  if (!data || typeof data !== 'object') return '';
  const keys = Object.keys(data).filter((k) => !k.startsWith('UDM_')).slice(0, 2);
  if (keys.length === 0) return '';
  return keys.map((k) => `${k}: ${String(data[k]).slice(0, 40)}`).join(' · ');
}

export function IdentityReviewList({
  items,
  recordMap,
  canResolve,
}: {
  items: IdentityReviewItem[];
  recordMap: Record<string, RecordPreview>;
  canResolve: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [actingId, setActingId] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground border border-border rounded-xl p-6 bg-card">
        No pairs are waiting for review. Low-confidence matches will appear here after sync.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {items.map((item) => {
        const a = recordMap[item.recordIdA];
        const b = recordMap[item.recordIdB];
        const busy = isPending && actingId === item.id;

        return (
          <li key={item.id}>
            <Card className="rounded-xl border-border bg-card">
              <CardHeader className="pb-2 space-y-1">
                <p className="text-sm font-semibold tracking-tight">
                  Possible duplicate — {Math.round(Number(item.confidence) * 100)}% confidence
                </p>
                <p className="text-xs text-muted-foreground">
                  Match rule:{' '}
                  <span className="font-mono text-foreground/90">{item.matchRule}</span>
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-border bg-background p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Record A</p>
                    <p className="text-sm font-mono break-all">{a?.email ?? a?.id ?? item.recordIdA}</p>
                    <p className="text-xs text-muted-foreground">
                      {(a?.sourceLabels ?? []).join(', ') || '—'}
                    </p>
                    {a?.data && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {formatSnippet(a.data)}
                      </p>
                    )}
                  </div>
                  <div className="rounded-lg border border-border bg-background p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Record B</p>
                    <p className="text-sm font-mono break-all">{b?.email ?? b?.id ?? item.recordIdB}</p>
                    <p className="text-xs text-muted-foreground">
                      {(b?.sourceLabels ?? []).join(', ') || '—'}
                    </p>
                    {b?.data && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {formatSnippet(b.data)}
                      </p>
                    )}
                  </div>
                </div>
                {canResolve ? (
                  <div className="flex flex-wrap gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9"
                      disabled={busy}
                      onClick={() => {
                        setActingId(item.id);
                        startTransition(async () => {
                          try {
                            await rejectIdentityMatch(item.id);
                          } finally {
                            setActingId(null);
                          }
                        });
                      }}
                    >
                      Keep separate
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-9"
                      disabled={busy}
                      onClick={() => {
                        setActingId(item.id);
                        startTransition(async () => {
                          try {
                            await acceptIdentityMatch(item.id);
                          } finally {
                            setActingId(null);
                          }
                        });
                      }}
                    >
                      Merge these records
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    You need org member access to resolve identity matches.
                  </p>
                )}
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
