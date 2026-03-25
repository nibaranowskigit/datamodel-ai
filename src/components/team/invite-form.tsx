'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { inviteMember } from '@/lib/actions/team';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { OrgRole } from '@/lib/roles';

type FormState = { error?: string; success?: boolean } | null;

async function inviteAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = formData.get('email') as string;
  const role = formData.get('role') as OrgRole;

  if (!email || !role) return { error: 'Email and role are required.' };

  try {
    await inviteMember(email, role);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to send invite.';
    if (msg.includes('already a member')) return { error: 'User is already a member.' };
    if (msg.includes('already pending')) return { error: 'Invite already pending for this email.' };
    return { error: msg };
  }
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <div className="space-y-1.5">
      <Label className="text-xs invisible" aria-hidden="true">‎</Label>
      <Button type="submit" size="sm" disabled={pending} className="h-9">
        {pending ? 'Sending…' : 'Send invite'}
      </Button>
    </div>
  );
}

export function InviteForm() {
  const [state, formAction] = useActionState(inviteAction, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Invite a teammate</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_9rem_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs">Email address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="colleague@company.com"
              className="h-9"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role" className="text-xs">Role</Label>
            <Select name="role" defaultValue="org:member">
              <SelectTrigger id="role" className="h-9 w-full">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="org:admin">Admin</SelectItem>
                <SelectItem value="org:member">Member</SelectItem>
                <SelectItem value="org:viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <SubmitButton />
        </form>
        {state?.error && (
          <p className="mt-3 text-sm text-destructive">{state.error}</p>
        )}
        {state?.success && (
          <p className="mt-3 text-sm text-green-600">Invite sent successfully.</p>
        )}
      </CardContent>
    </Card>
  );
}
