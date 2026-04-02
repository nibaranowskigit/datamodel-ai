import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { CreateOrganization } from '@clerk/nextjs';
import { PlanIntentBridge } from '@/components/auth/plan-intent-bridge';

export default async function CreateOrgPage() {
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');
  if (orgId) redirect('/onboarding');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-12">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Name your workspace</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          This is what your team will see.
        </p>
      </div>
      <PlanIntentBridge />
      <CreateOrganization
        afterCreateOrganizationUrl="/onboarding"
        skipInvitationScreen={false}
      />
    </div>
  );
}
