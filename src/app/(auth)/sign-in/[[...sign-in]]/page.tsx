import { SignIn } from '@clerk/nextjs';
import Link from 'next/link';
import { ValueProps } from '@/components/auth/value-props';

export default function SignInPage() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left — value props (desktop only) */}
      <div className="hidden lg:flex flex-col justify-center px-12 bg-muted/30 border-r border-border">
        <ValueProps />
      </div>

      {/* Right — sign-in form */}
      <div className="flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile-only headline */}
          <div className="text-center lg:hidden">
            <h1 className="text-2xl font-semibold tracking-tight">Datamodel.ai</h1>
            <p className="text-sm text-muted-foreground mt-1">
              The data model your AI agents trust.
            </p>
          </div>

          <SignIn
            forceRedirectUrl="/"
            signUpUrl="/sign-up"
          />

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/sign-up" className="underline underline-offset-4 hover:text-foreground duration-150">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
