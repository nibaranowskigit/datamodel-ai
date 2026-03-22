'use client';

import { useState } from 'react';
import {
  requestDataExport,
  hardResetDataModel,
  deleteOrg,
} from '@/lib/actions/danger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

type ActionId = 'export' | 'reset' | 'delete';

const ACTIONS = [
  {
    id: 'export' as ActionId,
    title: 'Export all data',
    description:
      "Download a JSON export of all your CDM records, UDM records, and sync logs. You'll receive an email with the file attached.",
    phrase: 'export data',
    buttonLabel: 'Export data',
    buttonVariant: 'outline' as const,
    dangerous: false,
  },
  {
    id: 'reset' as ActionId,
    title: 'Hard reset data model',
    description:
      'Deletes all CDM records, UDM records, and sync logs. Your org, team members, connected sources, and API keys are kept. This cannot be undone.',
    phrase: 'reset data model',
    buttonLabel: 'Hard reset',
    buttonVariant: 'destructive' as const,
    dangerous: true,
  },
  {
    id: 'delete' as ActionId,
    title: 'Delete organisation',
    description:
      'Permanently deletes all data, disconnects all sources, revokes all API keys, and removes all team members. Your Datamodel.ai workspace is gone. This cannot be undone.',
    phrase: 'delete my org',
    buttonLabel: 'Delete organisation',
    buttonVariant: 'destructive' as const,
    dangerous: true,
  },
] as const;

function ConfirmCard({
  action,
  onSuccess,
}: {
  action: (typeof ACTIONS)[number];
  onSuccess?: () => void;
}) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const matches = input.toLowerCase().trim() === action.phrase;

  async function handleExecute() {
    if (!matches) return;
    setLoading(true);
    setError('');
    try {
      if (action.id === 'export') await requestDataExport();
      if (action.id === 'reset') await hardResetDataModel();
      if (action.id === 'delete') await deleteOrg(); // server redirects — never returns
      setDone(true);
      setInput('');
      onSuccess?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (done && action.id === 'export') {
    return (
      <p className="text-sm text-green-500 py-2">
        Export requested. Check your email in a few minutes.
      </p>
    );
  }
  if (done && action.id === 'reset') {
    return (
      <p className="text-sm text-green-500 py-2">
        Data model reset. All records have been deleted.
      </p>
    );
  }

  return (
    <div className="space-y-3 pt-3 border-t border-border">
      <p className="text-xs text-muted-foreground">
        Type{' '}
        <code className="font-mono text-foreground bg-muted px-1.5 py-0.5 rounded">
          {action.phrase}
        </code>{' '}
        to confirm.
      </p>
      <div className="flex gap-3 max-w-sm">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleExecute()}
          placeholder={action.phrase}
          className="h-9 font-mono text-sm"
          autoFocus
        />
        <Button
          variant={action.buttonVariant}
          size="sm"
          disabled={!matches || loading}
          onClick={handleExecute}
          className="h-9 flex-shrink-0"
        >
          {loading ? 'Working…' : action.buttonLabel}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function DangerZoneActions({ orgName }: { orgName: string }) {
  const [expanded, setExpanded] = useState<ActionId | null>(null);

  return (
    <div className="space-y-3">
      {ACTIONS.map((action) => (
        <Card
          key={action.id}
          className={`p-5 space-y-3 ${action.dangerous ? 'border-destructive/30' : ''}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h3
                className={`text-sm font-semibold ${
                  action.dangerous ? 'text-destructive' : ''
                }`}
              >
                {action.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {action.description}
              </p>
            </div>
            {expanded !== action.id && (
              <Button
                variant={action.dangerous ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => setExpanded(action.id)}
                className="flex-shrink-0 h-8 text-xs"
              >
                {action.buttonLabel}
              </Button>
            )}
          </div>

          {expanded === action.id && (
            <ConfirmCard
              action={action}
              onSuccess={() => setExpanded(null)}
            />
          )}
        </Card>
      ))}
      {/* orgName consumed server-side only — kept as prop for future use */}
      <span className="sr-only">{orgName}</span>
    </div>
  );
}
