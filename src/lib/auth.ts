import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

/** Use at the top of every protected Server Component page. Redirects instead of throwing. */
export async function orgGuard(): Promise<{ orgId: string; userId: string }> {
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/create-org');
  return { orgId, userId };
}

/** Use in server actions — throws instead of redirecting. */
export async function getAuth(): Promise<{ orgId: string; userId: string }> {
  const { orgId, userId } = await auth();
  if (!orgId || !userId) throw new Error('Unauthorized');
  return { orgId, userId };
}

export async function getOrgId(): Promise<string> {
  const { orgId, userId } = await auth();
  if (!orgId || !userId) throw new Error('Unauthorized');
  return orgId;
}
