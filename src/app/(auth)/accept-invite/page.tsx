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
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-xl font-semibold tracking-tight">
          You&apos;ve been invited
        </h2>
        <p className="text-sm text-muted-foreground">
          Create an account or sign in to join your team on Datamodel.ai.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
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
              <span className="text-primary mt-0.5">✓</span>
              {line}
            </li>
          ))}
        </ul>
      </div>

      <Link
        href={signUpHref}
        className="flex h-10 w-full items-center justify-center rounded-lg bg-primary
                   text-sm font-medium text-primary-foreground transition-opacity
                   duration-150 hover:opacity-90"
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
  );
}
