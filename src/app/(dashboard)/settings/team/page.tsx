import { orgGuard } from '@/lib/auth';
import { clerkClient } from '@clerk/nextjs/server';
import { InviteForm } from '@/components/team/invite-form';
import { MemberList } from '@/components/team/member-list';
import { PendingInvites } from '@/components/team/pending-invites';

export default async function TeamPage() {
  const { orgId, userId } = await orgGuard();

  const client = await clerkClient();

  const [memberships, invitations] = await Promise.all([
    client.organizations.getOrganizationMembershipList({ organizationId: orgId }),
    client.organizations.getOrganizationInvitationList({
      organizationId: orgId,
      status: ['pending'],
    }),
  ]);

  const currentMember = memberships.data.find(
    (m) => m.publicUserData?.userId === userId,
  );
  const isAdmin = currentMember?.role === 'org:admin';

  const memberData = memberships.data.map((m) => ({
    id: m.id,
    role: m.role,
    createdAt: m.createdAt,
    publicUserData: m.publicUserData
      ? {
          userId: m.publicUserData.userId,
          identifier: m.publicUserData.identifier,
          firstName: m.publicUserData.firstName,
          lastName: m.publicUserData.lastName,
          imageUrl: m.publicUserData.imageUrl,
        }
      : null,
  }));

  const invitationData = invitations.data.map((i) => ({
    id: i.id,
    emailAddress: i.emailAddress,
    role: i.role,
    createdAt: i.createdAt,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage who has access to your Datamodel.ai workspace.
        </p>
      </div>
      {isAdmin && <InviteForm />}
      <MemberList members={memberData} currentUserId={userId} isAdmin={isAdmin} />
      <PendingInvites invitations={invitationData} />
    </div>
  );
}
