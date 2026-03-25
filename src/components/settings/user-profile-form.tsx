'use client';

import { useState } from 'react';
import { updateUserProfile } from '@/lib/actions/user-profile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

type Props = {
  firstName: string;
  lastName: string;
  email: string;
  imageUrl: string;
};

export function UserProfileForm({ firstName, lastName, email, imageUrl }: Props) {
  const [first, setFirst] = useState(firstName);
  const [last, setLast] = useState(lastName);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const isDirty = first !== firstName || last !== lastName;

  const initials =
    [firstName[0], lastName[0]].filter(Boolean).join('').toUpperCase() || '?';

  async function handleSave() {
    if (!isDirty) return;
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      await updateUserProfile({ firstName: first, lastName: last });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-6 space-y-5">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center flex-shrink-0">
          {imageUrl ? (
            <img src={imageUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg font-medium text-primary">{initials}</span>
          )}
        </div>
        <div>
          <p className="text-sm font-medium">Profile photo</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Managed via your Clerk account.{' '}
            <a
              href="https://accounts.clerk.dev/user"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Update photo →
            </a>
          </p>
        </div>
      </div>

      <div className="border-t border-border pt-4 space-y-4">
        {/* Name row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="first-name" className="text-xs">
              First name
            </Label>
            <Input
              id="first-name"
              value={first}
              onChange={(e) => setFirst(e.target.value)}
              className="h-9"
              maxLength={64}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="last-name" className="text-xs">
              Last name
            </Label>
            <Input
              id="last-name"
              value={last}
              onChange={(e) => setLast(e.target.value)}
              className="h-9"
              maxLength={64}
            />
          </div>
        </div>

        {/* Email — read only */}
        <div className="space-y-1.5">
          <Label className="text-xs">Email address</Label>
          <Input
            value={email}
            disabled
            className="h-9 opacity-50 cursor-not-allowed"
          />
          <p className="text-xs text-muted-foreground">
            Email is managed by your authentication provider.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 pt-2 border-t border-border">
        <Button onClick={handleSave} disabled={!isDirty || loading} size="sm">
          {loading ? 'Saving…' : 'Save changes'}
        </Button>
        {success && <span className="text-xs text-green-500">Changes saved.</span>}
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    </Card>
  );
}
