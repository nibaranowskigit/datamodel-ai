import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { testJob } from '@/lib/inngest/functions/test-job';
import { syncSourceJob } from '@/lib/inngest/functions/sync-source';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [testJob, syncSourceJob],
});

