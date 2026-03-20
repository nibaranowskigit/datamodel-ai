import { revokeInvite, resendInvite } from '@/lib/actions/team';
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
import type { OrgRole } from '@/lib/roles';

const ROLE_META: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  'org:admin': { label: 'Admin', variant: 'default' },
  'org:member': { label: 'Member', variant: 'secondary' },
  'org:viewer': { label: 'Viewer', variant: 'outline' },
};

type InvitationData = {
  id: string;
  emailAddress: string;
  role: string;
  createdAt: number;
};

type Props = {
  invitations: InvitationData[];
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

export function PendingInvites({ invitations }: Props) {
  if (invitations.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Pending Invites ({invitations.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead className="w-36" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.map((invite) => {
              const revokeWithId = revokeInvite.bind(null, invite.id);
              const resendWithParams = resendInvite.bind(
                null,
                invite.id,
                invite.emailAddress,
                invite.role as OrgRole,
              );

              return (
                <TableRow key={invite.id}>
                  <TableCell className="text-muted-foreground">
                    {invite.emailAddress}
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={invite.role} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(invite.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <form action={resendWithParams}>
                        <Button type="submit" variant="ghost" size="sm">
                          Resend
                        </Button>
                      </form>
                      <form action={revokeWithId}>
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          Revoke
                        </Button>
                      </form>
                    </div>
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
