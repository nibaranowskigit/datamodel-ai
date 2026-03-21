import Link from 'next/link';

export default function InviteExpiredPage() {
  return (
    <div className="space-y-6 text-center">
      <div className="flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
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

      <div className="bg-card border border-border rounded-xl p-4 text-left space-y-2">
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
              <span className="text-muted-foreground font-mono text-xs mt-0.5">
                {i + 1}.
              </span>
              {step}
            </li>
          ))}
        </ul>
      </div>

      <Link
        href="/sign-in"
        className="text-sm text-primary hover:underline"
      >
        Already have an account? Sign in →
      </Link>
    </div>
  );
}
