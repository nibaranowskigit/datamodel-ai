'use client';

import { useState } from 'react';
import { removeMember } from '@/lib/actions/team';
import { RoleBadge } from '@/components/team/role-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

type MemberData = {
  id: string;
  role: string;
  createdAt: number;
  publicUserData: {
    userId: string;
    identifier: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string;
  } | null;
};

type Props = {
  members: MemberData[];
  currentUserId: string;
  isAdmin: boolean;
};

const ROLE_ORDER: Record<string, number> = {
  'org:admin': 0,
  'org:member': 1,
  'org:viewer': 2,
};

function displayName(member: MemberData): string {
  const { firstName, lastName, identifier } = member.publicUserData ?? {};
  if (firstName || lastName) {
    return [firstName, lastName].filter(Boolean).join(' ');
  }
  return identifier ?? '—';
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function MemberList({ members, currentUserId, isAdmin }: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function handleRemove(targetUserId: string) {
    setLoadingId(targetUserId);
    setError('');
    try {
      await removeMember(targetUserId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove member.';
      setError(msg);
    } finally {
      setLoadingId(null);
    }
  }

  const sorted = [...members].sort((a, b) => {
    const aIsMe = a.publicUserData?.userId === currentUserId;
    const bIsMe = b.publicUserData?.userId === currentUserId;
    if (aIsMe) return -1;
    if (bIsMe) return 1;
    return (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Team Members ({members.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {error && (
          <p className="px-4 pb-3 text-xs text-destructive">{error}</p>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((member) => {
              const memberUserId = member.publicUserData?.userId ?? '';
              const isMe = memberUserId === currentUserId;

              return (
                <TableRow
                  key={member.id}
                  className={cn(isMe && 'bg-muted/40')}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2.5">
                      {member.publicUserData?.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={member.publicUserData.imageUrl}
                          alt=""
                          className="size-7 rounded-full object-cover"
                        />
                      )}
                      <span>{displayName(member)}</span>
                      {isMe && (
                        <span className="text-xs text-muted-foreground">(you)</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.publicUserData?.identifier ?? '—'}
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={member.role} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(member.createdAt)}
                  </TableCell>
                  <TableCell>
                    {isAdmin && !isMe && memberUserId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={loadingId === memberUserId}
                        onClick={() => handleRemove(memberUserId)}
                        className="text-muted-foreground hover:text-destructive h-7 px-2"
                      >
                        {loadingId === memberUserId ? '…' : 'Remove'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
