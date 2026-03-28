/**
 * Optional entrypoint for `fields/proposal.requested` — same engine as S1.4
 * `reconcile-and-propose` step (S2.0).
 */
import { inngest } from '../client';
import { notifyFieldApprovalNeeded } from '@/lib/notifications/notify-field-approval';
import { proposeFields } from '@/lib/ai/propose-fields';

// Human-readable labels for each source type — shared with notify-sync-failure
const SOURCE_META: Record<string, { label: string }> = {
  hubspot:  { label: 'HubSpot' },
  stripe:   { label: 'Stripe' },
  intercom: { label: 'Intercom' },
  mixpanel: { label: 'Mixpanel' },
};

export const proposeFieldsJob = inngest.createFunction(
  {
    id: 'propose-fields',
    retries: 3,
    triggers: [{ event: 'fields/proposal.requested' as const }],
  },
  async ({ event, step }) => {
    const { orgId, sourceType, syncRunId } = event.data as {
      orgId: string;
      sourceId: string;
      sourceType: string;
      syncRunId: string;
    };

    const sourceName = SOURCE_META[sourceType]?.label ?? sourceType;

    const newProposals = await step.run('generate-field-proposals', async () => {
      return proposeFields(orgId, syncRunId);
    });

    if (newProposals.length > 0) {
      await step.run('notify-field-approval', async () => {
        await notifyFieldApprovalNeeded({
          orgId,
          sourceType,
          sourceName,
          fieldCount: newProposals.length,
          syncRunId,
        });
      });
    }

    return { orgId, sourceType, fieldCount: newProposals.length };
  }
);
