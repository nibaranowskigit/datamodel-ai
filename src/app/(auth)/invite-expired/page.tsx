import Link from 'next/link';

export default function InviteExpiredPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Datamodel.ai</h1>
          <p className="text-sm text-muted-foreground mt-1">
            The data model your AI agents trust.
          </p>
        </div>

        <div className="space-y-6 text-center">
          <div className="flex items-center justify-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
              <span className="text-lg font-bold text-destructive">!</span>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight">Invite expired</h2>
            <p className="text-sm text-muted-foreground">
              This invite link is no longer valid. Invite links expire after 7 days.
            </p>
            <p className="text-sm text-muted-foreground">
              Ask your Admin to send a new invite from{' '}
              <span className="font-medium text-foreground">Settings → Team</span>.
            </p>
          </div>

          <div className="space-y-2 rounded-xl border border-border bg-card p-4 text-left">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              What to do next
            </p>
            <ul className="space-y-1.5">
              {[
                'Contact the person who invited you',
                'Ask them to go to Settings → Team',
                'They can resend or create a new invite',
              ].map((step, i) => (
                <li key={step} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {i + 1}.
                  </span>
                  {step}
                </li>
              ))}
            </ul>
          </div>

          <Link href="/sign-in" className="text-sm text-primary hover:underline">
            Already have an account? Sign in →
          </Link>
        </div>
      </div>
    </div>
  );
}
