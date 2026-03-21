'use client';

import { useSignIn } from '@clerk/nextjs';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';

// ForgotPassword flow — uses Clerk v7 signal-based useSignIn hook.
// Two steps: signIn.create({ identifier }) → signIn.resetPasswordEmailCode.sendCode()
// Clerk handles all reset mechanics; this page is a branded wrapper only.
function ForgotPasswordForm() {
  const { signIn, fetchStatus } = useSignIn();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isReady = fetchStatus === 'idle';

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isReady) return;

    setLoading(true);
    setError('');

    try {
      await signIn.create({ identifier: email.trim() });
      const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode();
      if (sendError) {
        setError(sendError.message ?? 'Failed to send reset email.');
      } else {
        setSubmitted(true);
      }
    } catch (err: unknown) {
      const clerkError = err as { errors?: Array<{ message: string }> };
      setError(
        clerkError.errors?.[0]?.message ?? 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="space-y-4 text-center">
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
          <p className="text-sm font-medium">Reset link sent</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Check your inbox for a link to reset your password. If it doesn&apos;t
            arrive, check your spam folder.
          </p>
        </div>
        <Link
          href="/sign-in"
          className="text-xs text-primary hover:underline underline-offset-4 duration-150"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label
          htmlFor="fp-email"
          className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
        >
          Email address
        </label>
        <input
          id="fp-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          required
          className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/60"
        />
      </div>

      {error && (
        <p className="text-xs text-red-400 leading-relaxed">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || !isReady}
        className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium transition-opacity duration-150 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
      >
        {loading ? 'Sending…' : 'Send reset link'}
      </button>
    </form>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold tracking-tight">Reset your password</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <ForgotPasswordForm />
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Remember it?{' '}
        <Link
          href="/sign-in"
          className="text-primary hover:underline underline-offset-4 duration-150"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
