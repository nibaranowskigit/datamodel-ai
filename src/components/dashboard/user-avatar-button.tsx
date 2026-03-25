'use client';

import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(' ');
  const initials =
    parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`
      : name.slice(0, 2);
  return (
    <span className="text-xs font-medium text-primary-foreground uppercase">
      {initials}
    </span>
  );
}

export function UserAvatarButton() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  if (!user) return null;

  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User';
  const email = user.primaryEmailAddress?.emailAddress ?? '';

  async function handleSignOut() {
    await signOut();
    router.push('/sign-in');
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center',
          'bg-primary/10 hover:bg-primary/20 transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-primary/40',
          open && 'ring-2 ring-primary/40',
        )}
        aria-label="User menu"
        aria-expanded={open}
      >
        {user.imageUrl ? (
          <img
            src={user.imageUrl}
            alt={fullName}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <Initials name={fullName} />
        )}
      </button>

      {open && (
        <div
          className={cn(
            'absolute right-0 top-10 z-50',
            'w-56 bg-popover border border-border rounded-xl',
            'py-1 overflow-hidden',
          )}
        >
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-medium truncate">{fullName}</p>
            <p className="text-xs text-muted-foreground truncate">{email}</p>
          </div>

          <div className="py-1">
            <Link
              href="/settings/me"
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm',
                'text-foreground hover:bg-muted transition-colors duration-150',
              )}
            >
              Your profile
            </Link>
          </div>

          <div className="border-t border-border py-1">
            <button
              onClick={handleSignOut}
              className={cn(
                'w-full flex items-center gap-2 px-4 py-2 text-sm text-left',
                'text-destructive hover:bg-destructive/5 transition-colors duration-150',
              )}
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
