import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { testJob } from '@/lib/inngest/functions/test-job';
import { syncSourceJob } from '@/lib/inngest/functions/sync-source';
import { exportOrgData } from '@/lib/inngest/functions/export-data';
import { proposeFieldsJob } from '@/lib/inngest/functions/propose-fields';
import { weeklyDigest } from '@/lib/inngest/functions/weekly-digest';
import { orchestrateSync } from '@/lib/inngest/functions/orchestrate-sync';
import { syncOrgSources } from '@/lib/inngest/functions/sync-org-sources';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    testJob,
    syncSourceJob,
    exportOrgData,
    proposeFieldsJob,
    weeklyDigest,
    orchestrateSync,
    syncOrgSources,
  ],
});

