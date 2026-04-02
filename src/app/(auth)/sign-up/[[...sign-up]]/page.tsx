import { SignUp } from '@clerk/nextjs';
import { PlanSelector } from '@/components/auth/plan-selector';
import { ValueProps } from '@/components/auth/value-props';

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  const defaultPlan = plan ?? 'starter';

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left — value props (desktop only) */}
      <div className="hidden lg:flex flex-col justify-center px-12 bg-muted/30 border-r border-border">
        <ValueProps />
      </div>

      {/* Right — plan selector + sign-up form */}
      <div className="flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile-only headline */}
          <div className="text-center lg:hidden">
            <h1 className="text-2xl font-semibold tracking-tight">Datamodel.ai</h1>
            <p className="text-sm text-muted-foreground mt-1">
              The data model your AI agents trust.
            </p>
          </div>

          <PlanSelector defaultPlan={defaultPlan} />

          <SignUp
            forceRedirectUrl="/create-org"
            signInUrl="/sign-in"
          />
        </div>
      </div>
    </div>
  );
}
