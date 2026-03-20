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
    <Button type="submit" disabled={pending} className="shrink-0">
      {pending ? 'Sending…' : 'Send invite'}
    </Button>
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
        <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="colleague@company.com"
              required
            />
          </div>
          <div className="w-full space-y-1.5 sm:w-36">
            <Label htmlFor="role">Role</Label>
            <Select name="role" defaultValue="org:viewer">
              <SelectTrigger id="role" className="w-full">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="org:admin">Admin</SelectItem>
                <SelectItem value="org:member">Member</SelectItem>
                <SelectItem value="org:viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="shrink-0 space-y-1.5">
            <Label className="invisible select-none" aria-hidden>
              &nbsp;
            </Label>
            <SubmitButton />
          </div>
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
