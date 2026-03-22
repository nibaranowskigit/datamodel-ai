'use client';

import { useState } from 'react';
import { disconnectSource, reconnectSource } from '@/lib/actions/sources';
import { getSourceFields, SOURCE_META } from '@/lib/connectors/source-fields';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type SourceStatus = 'active' | 'pending' | 'error' | 'inactive';

interface Source {
  id: string;
  sourceType: string;
  displayName: string;
  status: SourceStatus;
  lastSyncAt: Date | null;
  lastSyncError: string | null;
}

interface SyncLog {
  id: string;
  sourceType: string;
  status: string;
  recordsUpserted: number | null;
  startedAt: Date;
}

interface Props {
  sources: Source[];
  latestLogs: Record<string, SyncLog>;
  isAdmin: boolean;
}

const STATUS_BADGE: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  active:  { label: 'Active',  variant: 'default' },
  pending: { label: 'Pending', variant: 'secondary' },
  error:   { label: 'Error',   variant: 'destructive' },
};

function timeAgo(date: Date | string | null): string {
  if (!date) return 'Never';
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function SourcesList({ sources, latestLogs, isAdmin }: Props) {
  const [confirmDisconnect, setConfirmDisconnect] = useState<string | null>(null);
  const [reconnectId, setReconnectId]             = useState<string | null>(null);
  const [reconnectFields, setReconnectFields]     = useState<Record<string, string>>({});
  const [loadingId, setLoadingId]                 = useState<string | null>(null);
  const [error, setError]                         = useState('');

  if (sources.length === 0) {
    return (
      <Card className="p-8 text-center space-y-3 rounded-xl border border-border">
        <p className="text-sm text-muted-foreground">No sources connected.</p>
        <a
          href="/onboarding/connect"
          className="text-sm text-primary hover:underline"
        >
          Connect your first source →
        </a>
      </Card>
    );
  }

  async function handleDisconnect(sourceId: string) {
    if (confirmDisconnect !== sourceId) {
      setConfirmDisconnect(sourceId);
      return;
    }
    setLoadingId(sourceId);
    setConfirmDisconnect(null);
    setError('');
    try {
      await disconnectSource(sourceId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect.');
    } finally {
      setLoadingId(null);
    }
  }

  async function handleReconnect(sourceId: string) {
    setLoadingId(sourceId);
    setError('');
    try {
      await reconnectSource({ sourceId, config: reconnectFields });
      setReconnectId(null);
      setReconnectFields({});
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reconnect.');
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-xs text-destructive">{error}</p>}

      {sources.map((source) => {
        const meta         = SOURCE_META[source.sourceType] ?? { label: source.sourceType, color: 'gray' };
        const log          = latestLogs[source.sourceType];
        const badge        = STATUS_BADGE[source.status] ?? { label: source.status, variant: 'outline' as const };
        const isLoading    = loadingId === source.id;
        const isReconnecting = reconnectId === source.id;
        const fields       = getSourceFields(source.sourceType);
        const allFilled    = fields.length > 0 && fields.every((f) => !!reconnectFields[f.key]);

        return (
          <Card key={source.id} className="p-4 space-y-3 rounded-xl border border-border">
            <div className="flex items-center justify-between">
              {/* Left — source info */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-muted-foreground uppercase">
                    {meta.label.slice(0, 2)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium">{meta.label}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <Badge variant={badge.variant} className="text-xs">
                      {badge.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Last sync: {timeAgo(source.lastSyncAt)}
                    </span>
                    {log?.recordsUpserted != null && (
                      <span className="text-xs text-muted-foreground">
                        · {log.recordsUpserted.toLocaleString()} records
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right — admin actions */}
              {isAdmin && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  {(source.status === 'error' || source.status === 'pending') && !isReconnecting && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReconnectId(source.id);
                        setReconnectFields({});
                        setError('');
                      }}
                      disabled={isLoading}
                      className="h-7 text-xs"
                    >
                      Reconnect
                    </Button>
                  )}

                  {confirmDisconnect === source.id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">Sure?</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDisconnect(source.id)}
                        disabled={isLoading}
                        className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                      >
                        Yes
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmDisconnect(null)}
                        className="h-7 px-2 text-xs"
                      >
                        No
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDisconnect(source.id)}
                      disabled={isLoading}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive duration-150"
                    >
                      {isLoading ? '…' : 'Disconnect'}
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Error message */}
            {source.status === 'error' && source.lastSyncError && (
              <p className="text-xs text-destructive bg-destructive/5 rounded px-3 py-2 font-mono">
                {source.lastSyncError}
              </p>
            )}

            {/* Reconnect inline form */}
            {isReconnecting && (
              <div className="border-t border-border pt-3 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Enter new credentials for {meta.label}.
                </p>
                {fields.map((field) => (
                  <div key={field.key} className="space-y-1">
                    <Label className="text-xs">{field.label}</Label>
                    <Input
                      type={field.type}
                      value={reconnectFields[field.key] ?? ''}
                      onChange={(e) =>
                        setReconnectFields((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }))
                      }
                      className="h-8 max-w-sm font-mono text-xs bg-transparent border-input"
                      placeholder={field.type === 'password' ? '••••••••' : ''}
                    />
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleReconnect(source.id)}
                    disabled={isLoading || !allFilled}
                    className="h-7 text-xs"
                  >
                    {isLoading ? 'Saving…' : 'Save credentials'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setReconnectId(null);
                      setReconnectFields({});
                    }}
                    className="h-7 text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
