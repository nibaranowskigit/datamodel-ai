'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { requireRole, type OrgRole } from '@/lib/roles';

export async function inviteMember(email: string, role: OrgRole) {
  await requireRole('org:admin');
  const { orgId, userId } = await auth();

  const client = await clerkClient();

  try {
    await client.organizations.createOrganizationInvitation({
      organizationId: orgId!,
      emailAddress: email,
      role,
      inviterUserId: userId!,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    });
  } catch (err: unknown) {
    const clerkErr = err as { errors?: { code: string; message: string }[] };
    const code = clerkErr?.errors?.[0]?.code;
    if (code === 'duplicate_record') {
      throw new Error('An invite has already been sent to this email address.');
    }
    throw new Error('Failed to send invite. Please try again.');
  }

  revalidatePath('/settings/team');
}

export async function resendInvite(
  invitationId: string,
  email: string,
  role: OrgRole,
) {
  await requireRole('org:admin');
  const { orgId, userId } = await auth();

  const client = await clerkClient();

  await client.organizations.revokeOrganizationInvitation({
    organizationId: orgId!,
    invitationId,
    requestingUserId: userId!,
  });

  await client.organizations.createOrganizationInvitation({
    organizationId: orgId!,
    emailAddress: email,
    role,
    inviterUserId: userId!,
    redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
  });

  revalidatePath('/settings/team');
}

export async function revokeInvite(invitationId: string) {
  await requireRole('org:admin');
  const { orgId, userId } = await auth();

  const client = await clerkClient();
  await client.organizations.revokeOrganizationInvitation({
    organizationId: orgId!,
    invitationId,
    requestingUserId: userId!,
  });

  revalidatePath('/settings/team');
}

export async function removeMember(targetUserId: string) {
  await requireRole('org:admin');
  const { orgId, userId } = await auth();

  if (targetUserId === userId) {
    throw new Error('Cannot remove yourself');
  }

  const client = await clerkClient();

  const adminMemberships = await client.organizations.getOrganizationMembershipList({
    organizationId: orgId!,
    role: ['org:admin'],
  });

  const isTargetAdmin = adminMemberships.data.some(
    (m) => m.publicUserData?.userId === targetUserId,
  );

  if (isTargetAdmin && adminMemberships.data.length <= 1) {
    throw new Error('Org must have at least one Admin');
  }

  await client.organizations.deleteOrganizationMembership({
    organizationId: orgId!,
    userId: targetUserId,
  });

  revalidatePath('/settings/team');
}

export async function updateMemberRole(targetUserId: string, role: OrgRole) {
  await requireRole('org:admin');
  const { orgId } = await auth();

  const client = await clerkClient();
  await client.organizations.updateOrganizationMembership({
    organizationId: orgId!,
    userId: targetUserId,
    role,
  });

  revalidatePath('/settings/team');
}
