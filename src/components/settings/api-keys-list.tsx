'use client';

import { useState } from 'react';
import { createApiKey, revokeApiKey, rotateApiKey } from '@/lib/actions/api-keys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ApiKey } from '@/lib/db/schema';

type KeyRow = Omit<ApiKey, 'keyHash'>;

function KeyCreatedModal({
  fullKey,
  onClose,
}: {
  fullKey: string;
  onClose: () => void;
}) {
  const [copied, setCopied]       = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(fullKey);
    setCopied(true);
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
      <Card className="w-full max-w-md p-6 space-y-5">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">Your new API key</h3>
          <p className="text-sm text-muted-foreground">
            Copy this key now. You won&apos;t be able to see it again.
          </p>
        </div>

        <div className="bg-muted rounded-lg px-4 py-3 flex items-center justify-between gap-3">
          <code className="text-xs font-mono break-all text-foreground flex-1">
            {fullKey}
          </code>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="flex-shrink-0 h-7 text-xs"
          >
            {copied ? 'Copied ✓' : 'Copy'}
          </Button>
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5"
          />
          <span className="text-sm text-muted-foreground">
            I&apos;ve copied this key and stored it safely.
          </span>
        </label>

        <Button
          onClick={onClose}
          disabled={!confirmed}
          className="w-full"
          size="sm"
        >
          Done
        </Button>
      </Card>
    </div>
  );
}

export function ApiKeysList({
  keys,
  isAdmin,
}: {
  keys: KeyRow[];
  isAdmin: boolean;
}) {
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [confirmId, setConfirmId]   = useState<string | null>(null);
  const [loadingId, setLoadingId]   = useState<string | null>(null);
  const [creating, setCreating]     = useState(false);
  const [error, setError]           = useState('');

  async function handleCreate() {
    if (!newKeyName.trim()) return;
    setCreating(true);
    setError('');
    try {
      const { fullKey } = await createApiKey({ name: newKeyName, scopes: [] });
      setCreatedKey(fullKey);
      setNewKeyName('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create key.');
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(keyId: string) {
    if (confirmId !== keyId) { setConfirmId(keyId); return; }
    setLoadingId(keyId);
    setConfirmId(null);
    setError('');
    try {
      await revokeApiKey(keyId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to revoke key.');
    } finally {
      setLoadingId(null);
    }
  }

  async function handleRotate(keyId: string) {
    setLoadingId(keyId);
    setError('');
    try {
      const { fullKey } = await rotateApiKey(keyId);
      setCreatedKey(fullKey);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to rotate key.');
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <>
      {createdKey && (
        <KeyCreatedModal
          fullKey={createdKey}
          onClose={() => setCreatedKey(null)}
        />
      )}

      <div className="space-y-4">
        {isAdmin && (
          <Card className="p-4 space-y-3">
            <p className="text-sm font-medium">Create new key</p>
            <div className="flex gap-3">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="key-name" className="text-xs">Key name</Label>
                <Input
                  id="key-name"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder="e.g. Outreach agent — production"
                  className="h-9"
                  maxLength={64}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleCreate}
                  disabled={!newKeyName.trim() || creating}
                  size="sm"
                  className="h-9"
                >
                  {creating ? 'Creating…' : 'Create key'}
                </Button>
              </div>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </Card>
        )}

        {keys.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No API keys yet.{isAdmin ? ' Create one above.' : ' Ask an Admin to create a key.'}
          </p>
        ) : (
          <Card className="divide-y divide-border overflow-hidden">
            {keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{key.name}</p>
                    {key.scopes.length === 0 && (
                      <Badge variant="secondary" className="text-xs">
                        Full access
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <code className="text-xs font-mono text-muted-foreground">
                      {key.keyPrefix}
                    </code>
                    <span className="text-xs text-muted-foreground">
                      Created {new Date(key.createdAt).toLocaleDateString()}
                    </span>
                    {key.lastUsedAt ? (
                      <span className="text-xs text-muted-foreground">
                        Last used {new Date(key.lastUsedAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Never used
                      </span>
                    )}
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={loadingId === key.id}
                      onClick={() => handleRotate(key.id)}
                      className="h-7 px-2 text-xs text-muted-foreground"
                    >
                      Rotate
                    </Button>

                    {confirmId === key.id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">Sure?</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={loadingId === key.id}
                          onClick={() => handleRevoke(key.id)}
                          className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                        >
                          Yes
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmId(null)}
                          className="h-7 px-2 text-xs"
                        >
                          No
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={loadingId === key.id}
                        onClick={() => handleRevoke(key.id)}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </Card>
        )}
      </div>
    </>
  );
}
