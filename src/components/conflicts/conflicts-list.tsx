'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { resolveConflict } from '@/lib/actions/conflicts';
import type { CDMConflict } from '@/lib/db/schema';

type ConflictWithRecord = CDMConflict & {
  udmRecord: { id: string; email: string | null } | null;
};

interface ConflictsListProps {
  conflicts: ConflictWithRecord[];
  canResolve: boolean;
}

function ConflictRow({
  conflict,
  canResolve,
}: {
  conflict: ConflictWithRecord;
  canResolve: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [resolving, setResolving] = useState<'a' | 'b' | null>(null);

  function handleResolve(side: 'a' | 'b') {
    const value  = side === 'a' ? conflict.valueA  : conflict.valueB;
    const source = side === 'a' ? conflict.sourceTypeA : conflict.sourceTypeB;
    if (!value) return;

    setResolving(side);
    startTransition(async () => {
      await resolveConflict(conflict.id, value, source);
      setResolving(null);
    });
  }

  const email = conflict.udmRecord?.email ?? 'unknown';

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-xs font-mono text-foreground font-medium">
            {conflict.fieldKey}
          </span>
          <span className="text-xs text-muted-foreground ml-2">—</span>
          <span className="text-xs text-muted-foreground ml-2 font-mono">{email}</span>
        </div>
        <Badge variant="outline" className="text-xs shrink-0">unresolved</Badge>
      </div>

      <div className="space-y-2">
        {/* Source A */}
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
          <div className="flex-1 min-w-0">
            <span className="text-xs font-medium text-muted-foreground capitalize mr-2">
              {conflict.sourceTypeA}
            </span>
            <span className="text-sm text-foreground font-mono truncate">
              {conflict.valueA ?? <span className="text-muted-foreground italic">empty</span>}
            </span>
          </div>
          {canResolve && (
            <Button
              size="sm"
              variant={resolving === 'a' ? 'default' : 'outline'}
              className="h-7 text-xs shrink-0"
              disabled={isPending}
              onClick={() => handleResolve('a')}
            >
              {resolving === 'a' ? 'Saving…' : 'Use this'}
            </Button>
          )}
        </div>

        {/* Source B */}
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
          <div className="flex-1 min-w-0">
            <span className="text-xs font-medium text-muted-foreground capitalize mr-2">
              {conflict.sourceTypeB}
            </span>
            <span className="text-sm text-foreground font-mono truncate">
              {conflict.valueB ?? <span className="text-muted-foreground italic">empty</span>}
            </span>
          </div>
          {canResolve && (
            <Button
              size="sm"
              variant={resolving === 'b' ? 'default' : 'outline'}
              className="h-7 text-xs shrink-0"
              disabled={isPending}
              onClick={() => handleResolve('b')}
            >
              {resolving === 'b' ? 'Saving…' : 'Use this'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ConflictsList({ conflicts, canResolve }: ConflictsListProps) {
  if (conflicts.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card px-6 py-12 text-center">
        <p className="text-sm font-medium text-foreground">No open conflicts</p>
        <p className="text-xs text-muted-foreground mt-1">
          All field values are in agreement across your connected sources.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {conflicts.map((conflict) => (
        <ConflictRow key={conflict.id} conflict={conflict} canResolve={canResolve} />
      ))}
    </div>
  );
}
