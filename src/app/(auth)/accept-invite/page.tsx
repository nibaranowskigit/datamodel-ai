import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string; __clerk_ticket?: string }>;
}) {
  const { userId } = await auth();
  const params = await searchParams;

  // Already signed in — let Clerk process the invite via root routing
  if (userId) redirect('/');

  const ticket = params.ticket ?? params.__clerk_ticket;
  const signUpHref = ticket
    ? `/sign-up?__clerk_ticket=${ticket}`
    : '/sign-up';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Datamodel.ai</h1>
          <p className="text-sm text-muted-foreground mt-1">
            The data model your AI agents trust.
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-xl font-semibold tracking-tight">
              You&apos;ve been invited
            </h2>
            <p className="text-sm text-muted-foreground">
              Create an account or sign in to join your team on Datamodel.ai.
            </p>
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <span className="text-sm font-semibold text-primary">D</span>
              </div>
              <div>
                <p className="text-sm font-medium">Datamodel.ai</p>
                <p className="text-xs text-muted-foreground">
                  The data model your AI agents trust.
                </p>
              </div>
            </div>

            <ul className="space-y-1.5 pt-1">
              {[
                'One canonical data model — all agents read from the same source',
                'Role-based access — your role is set by your Admin',
                'Connect HubSpot, Salesforce, Stripe, and more',
              ].map((line) => (
                <li key={line} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="mt-0.5 text-primary">✓</span>
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <Link
            href={signUpHref}
            className="flex h-9 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-opacity duration-150 hover:opacity-90"
          >
            Accept invite &amp; create account
          </Link>

          <p className="text-center text-xs text-muted-foreground">
            Already have an account?{' '}
            <Link href="/sign-in" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
