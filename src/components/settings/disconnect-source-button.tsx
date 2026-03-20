'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { disconnectSource } from '@/lib/actions/sources';

interface Props {
  sourceId: string;
  sourceName: string;
}

export function DisconnectSourceButton({ sourceId, sourceName }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleDisconnect() {
    if (!confirm(`Disconnect ${sourceName}? This will purge stored credentials.`)) return;

    startTransition(async () => {
      try {
        await disconnectSource(sourceId);
        toast.success(`${sourceName} disconnected`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to disconnect source');
      }
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDisconnect}
      disabled={isPending}
      className="text-destructive hover:text-destructive"
    >
      {isPending ? 'Disconnecting…' : 'Disconnect'}
    </Button>
  );
}
