import { removeMember } from '@/lib/actions/team';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type MemberRole = string;

const ROLE_META: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  'org:admin': { label: 'Admin', variant: 'default' },
  'org:member': { label: 'Member', variant: 'secondary' },
  'org:viewer': { label: 'Viewer', variant: 'outline' },
};

type MemberData = {
  id: string;
  role: MemberRole;
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
};

function RoleBadge({ role }: { role: string }) {
  const meta = ROLE_META[role] ?? { label: role, variant: 'outline' as const };
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function displayName(member: MemberData): string {
  const { firstName, lastName, identifier } = member.publicUserData ?? {};
  if (firstName || lastName) {
    return [firstName, lastName].filter(Boolean).join(' ');
  }
  return identifier ?? '—';
}

export function MemberList({ members, currentUserId }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Team Members ({members.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
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
            {members.map((member) => {
              const targetUserId = member.publicUserData?.userId;
              const isSelf = targetUserId === currentUserId;
              const removeWithId = removeMember.bind(null, targetUserId ?? '');

              return (
                <TableRow key={member.id}>
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
                    {!isSelf && targetUserId && (
                      <form action={removeWithId}>
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          Remove
                        </Button>
                      </form>
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
