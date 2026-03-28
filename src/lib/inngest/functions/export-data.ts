import { inngest } from '../client';
import { db } from '@/lib/db';
import { orgs, cdmRecords, udmRecords, syncLogs } from '@/lib/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { resend } from '@/lib/resend';

export const exportOrgData = inngest.createFunction(
  {
    id: 'export-org-data',
    name: 'Export Org Data',
    triggers: [{ event: 'org/data.export.requested' as const }],
  },
  async ({ event, step }: { event: { data: { orgId: string; requestedBy: string } }; step: { run: <T>(id: string, fn: () => Promise<T>) => Promise<T> } }) => {
    const { orgId, requestedBy } = event.data;

    const exportPayload = await step.run('build-export', async () => {
      const [org, cdm, udm, logs] = await Promise.all([
        db.query.orgs.findFirst({
          where: eq(orgs.id, orgId),
          columns: {
            id: true,
            name: true,
            businessType: true,
            vertical: true,
            stage: true,
          },
        }),
        db.query.cdmRecords.findMany({ where: eq(cdmRecords.orgId, orgId) }),
        db.query.udmRecords.findMany({
          where: and(eq(udmRecords.orgId, orgId), isNull(udmRecords.aliasOfId)),
        }),
        db.query.syncLogs.findMany({ where: eq(syncLogs.orgId, orgId) }),
      ]);

      return {
        exportedAt: new Date().toISOString(),
        org,
        cdmRecords: cdm,
        udmRecords: udm,
        syncLogs: logs,
      };
    });

    const { clerkClient } = await import('@clerk/nextjs/server');
    const client = await clerkClient();

    const user = await step.run('get-user-email', async () => {
      return client.users.getUser(requestedBy);
    });

    const email = user.emailAddresses[0]?.emailAddress;
    if (!email) return { error: 'No email found for requesting user.' };

    await step.run('send-export-email', async () => {
      const json = JSON.stringify(exportPayload, null, 2);
      const base64 = Buffer.from(json).toString('base64');

      await resend.emails.send({
        from: 'Datamodel.ai <exports@datamodel.ai>',
        to: email,
        subject: 'Your data export is ready',
        html: `
          <p>Hi,</p>
          <p>Your data export for <strong>${exportPayload.org?.name ?? orgId}</strong> is attached.</p>
          <p>The file contains all CDM records, UDM records, and sync logs.</p>
          <p>— Datamodel.ai</p>
        `,
        attachments: [
          {
            filename: `datamodel-export-${orgId}-${Date.now()}.json`,
            content: base64,
          },
        ],
      });
    });

    return { exported: true, sentTo: email };
  },
);
