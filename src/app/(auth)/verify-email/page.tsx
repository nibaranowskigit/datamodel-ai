import Link from 'next/link';

export default function VerifyEmailPage() {
  return (
    <div className="space-y-6 text-center">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
        <svg
          className="size-5 text-primary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </div>

      <div>
        <h2 className="text-xl font-semibold tracking-tight">Check your email</h2>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
          We sent a verification link to your email address.
          Click the link to continue setting up your account.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-3 text-left">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Next steps
        </p>
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
          <li>Open the email from Datamodel.ai</li>
          <li>Click the verification link</li>
          <li>You&apos;ll be brought back to finish setup</li>
        </ol>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Didn&apos;t receive it? Check your spam folder or{' '}
        <Link
          href="/sign-up"
          className="text-primary hover:underline underline-offset-4 duration-150"
        >
          try signing up again
        </Link>
        .
      </p>
    </div>
  );
}
