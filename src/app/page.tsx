import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { orgs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export default async function RootPage() {
  const { userId, orgId } = await auth();

  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/create-org');

  const org = await db.query.orgs.findFirst({
    where: eq(orgs.id, orgId),
    columns: { businessType: true },
  });

  // org null = webhook delay edge case → treat as incomplete → onboarding handles re-check
  if (!org || !org.businessType) redirect('/onboarding');

  redirect('/dashboard');
}
