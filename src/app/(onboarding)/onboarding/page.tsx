import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { orgs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { BusinessTypeForm } from '@/components/onboarding/business-type-form';

export default async function OnboardingPage() {
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/create-org');

  const org = await db.query.orgs.findFirst({
    where: eq(orgs.id, orgId),
  });

  if (org?.businessType) redirect('/dashboard');

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="flex items-center gap-2 mb-10">
          <div className="bg-primary w-4 h-1.5 rounded-full" />
          <div className="bg-muted w-1.5 h-1.5 rounded-full" />
          <div className="bg-muted w-1.5 h-1.5 rounded-full" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Tell us about your business</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          This helps us build the right data model for you.
        </p>
        <div className="mt-8">
          <BusinessTypeForm />
        </div>
      </div>
    </div>
  );
}
