import { auth } from '@clerk/nextjs/server';

export type OrgRole = 'org:admin' | 'org:member' | 'org:viewer';

const ROLE_HIERARCHY: Record<OrgRole, number> = {
  'org:admin': 3,
  'org:member': 2,
  'org:viewer': 1,
};

export async function getRole(): Promise<OrgRole | null> {
  const { orgRole } = await auth();
  return (orgRole as OrgRole) ?? null;
}

export async function requireRole(minimum: OrgRole): Promise<void> {
  const { orgId, userId, orgRole } = await auth();
  if (!orgId || !userId) throw new Error('Unauthorized');
  const role = orgRole as OrgRole;
  if (!role || ROLE_HIERARCHY[role] < ROLE_HIERARCHY[minimum]) {
    throw new Error('Forbidden — insufficient role');
  }
}
