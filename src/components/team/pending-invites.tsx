'use client';

import { useState } from 'react';
import { revokeInvite, resendInvite } from '@/lib/actions/team';
import { RoleBadge } from '@/components/team/role-badge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

const INVITE_TTL_DAYS = 7;

function isExpired(createdAt: number): boolean {
  const expiryMs = createdAt + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() > expiryMs;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

type InvitationData = {
  id: string;
  emailAddress: string;
  role: string;
  createdAt: number;
};

export function PendingInvites({
  invitations,
  isAdmin,
}: {
  invitations: InvitationData[];
  isAdmin: boolean;
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [localInvites, setLocalInvites] = useState(invitations);
  const [error, setError] = useState('');

  if (!isAdmin) return null;

  if (localInvites.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Pending invites</h3>
        <p className="text-xs text-muted-foreground">
          No pending invites. Use the form above to invite teammates.
        </p>
      </div>
    );
  }

  async function handleRevoke(id: string) {
    if (confirmId !== id) {
      setConfirmId(id);
      return;
    }
    setLoadingId(id);
    setConfirmId(null);
    setError('');
    try {
      await revokeInvite(id);
      setLocalInvites((prev) => prev.filter((inv) => inv.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to revoke invite.';
      // Treat Clerk 404 as success — invite already gone
      if (msg.toLowerCase().includes('not found') || msg.includes('404')) {
        setLocalInvites((prev) => prev.filter((inv) => inv.id !== id));
      } else {
        setError(msg);
      }
    } finally {
      setLoadingId(null);
    }
  }

  async function handleResend(id: string, email: string, role: string) {
    setLoadingId(id);
    setError('');
    try {
      await resendInvite(id, email, role as import('@/lib/roles').OrgRole);
      setSuccessId(id);
      // Update the invite's createdAt optimistically so expiry clears
      setLocalInvites((prev) =>
        prev.map((inv) => (inv.id === id ? { ...inv, createdAt: Date.now() } : inv)),
      );
      setTimeout(() => setSuccessId(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend invite.');
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">
        Pending invites ({localInvites.length})
      </h3>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Card className="divide-y divide-border overflow-hidden">
        {localInvites.map((inv) => {
          const expired = isExpired(inv.createdAt);
          const isLoading = loadingId === inv.id;
          const isSuccess = successId === inv.id;
          const isConfirming = confirmId === inv.id;

          return (
            <div
              key={inv.id}
              className="flex items-center justify-between px-4 py-3"
            >
              {/* Left — email + meta */}
              <div className="min-w-0 space-y-1">
                <p className="truncate text-sm font-medium">{inv.emailAddress}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <RoleBadge role={inv.role} />
                  <span className="text-xs text-muted-foreground">
                    Sent {formatDate(inv.createdAt)}
                  </span>
                  {expired && !isSuccess && (
                    <Badge variant="warning" className="text-xs">
                      Expired
                    </Badge>
                  )}
                  {isSuccess && (
                    <span className="text-xs text-green-400">Invite resent ✓</span>
                  )}
                </div>
              </div>

              {/* Right — actions */}
              <div className="ml-4 flex flex-shrink-0 items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isLoading}
                  onClick={() => handleResend(inv.id, inv.emailAddress, inv.role)}
                  className="h-7 px-2 text-xs"
                >
                  Resend
                </Button>

                {isConfirming ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">Sure?</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isLoading}
                      onClick={() => handleRevoke(inv.id)}
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
                    disabled={isLoading}
                    onClick={() => handleRevoke(inv.id)}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                  >
                    {isLoading ? '…' : 'Revoke'}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
