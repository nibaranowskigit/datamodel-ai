'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { approveField } from '@/lib/actions/fields';
import { Button } from '@/components/ui/button';

export function ApproveRegistryFieldButton({ fieldId }: { fieldId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      className="h-9 shrink-0"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          try {
            await approveField(fieldId);
            toast.success('Field approved to production');
          } catch (e) {
            toast.error((e as Error).message);
          }
        });
      }}
    >
      Approve
    </Button>
  );
}
