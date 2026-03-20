import { auth } from '@clerk/nextjs/server';

export async function getOrgId(): Promise<string> {
  const { orgId, userId } = await auth();
  if (!orgId || !userId) throw new Error('Unauthorized');
  return orgId;
}

export async function getAuth(): Promise<{ orgId: string; userId: string }> {
  const { orgId, userId } = await auth();
  if (!orgId || !userId) throw new Error('Unauthorized');
  return { orgId, userId };
}
