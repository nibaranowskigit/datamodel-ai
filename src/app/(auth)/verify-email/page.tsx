import Link from 'next/link';

export default function VerifyEmailPage() {
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
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
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

          <div className="space-y-3 rounded-xl border border-border bg-card p-5 text-left">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Next steps
            </p>
            <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
              <li>Open the email from Datamodel.ai</li>
              <li>Click the verification link</li>
              <li>You&apos;ll be brought back to finish setup</li>
            </ol>
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Didn&apos;t receive it? Check your spam folder or{' '}
            <Link
              href="/sign-up"
              className="text-primary underline-offset-4 duration-150 hover:underline"
            >
              try signing up again
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
