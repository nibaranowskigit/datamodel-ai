/**
 * NOTIF.3 stub — field proposal pipeline.
 * The AI generation logic (generateObject + Zod) will be filled in by S2.0.
 * This file establishes the Inngest function structure and wires in the
 * notifyFieldApprovalNeeded() call that NOTIF.3 requires.
 */
import { inngest } from '../client';
import { notifyFieldApprovalNeeded } from '@/lib/notifications/notify-field-approval';

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

    // Step 1 — AI generates proposed fields (S2.0 will implement this)
    // TODO(S2.0): call generateObject() + Zod, insert to udmFields with status='proposed'
    const newProposals = await step.run('generate-field-proposals', async () => {
      // Placeholder — S2.0 replaces this with real AI proposal logic
      return [] as { fieldKey: string }[];
    });

    // Step 2 — notify opted-in org members that proposals are ready for review
    // Always runs after DB inserts so users are never alerted without a record.
    await step.run('notify-field-approval', async () => {
      await notifyFieldApprovalNeeded({
        orgId,
        sourceType,
        sourceName,
        fieldCount: newProposals.length,
        syncRunId,
      });
    });

    return { orgId, sourceType, fieldCount: newProposals.length };
  }
);
