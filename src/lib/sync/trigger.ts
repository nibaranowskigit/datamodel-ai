import { inngest } from '@/lib/inngest/client';

export async function triggerSourceSync(input: {
  orgId: string;
  sourceId: string;
  sourceType: string;
}) {
  await inngest.send({
    name: 'sync/source.requested',
    data: input,
  });
}
