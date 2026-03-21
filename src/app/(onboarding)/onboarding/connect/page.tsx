import { orgGuard } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { orgs, dataSources } from '@/lib/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { ConnectSourcesForm } from '@/components/onboarding/connect-sources-form';

export default async function ConnectPage() {
  const { orgId } = await orgGuard();

  const org = await db.query.orgs.findFirst({ where: eq(orgs.id, orgId) });
  if (!org?.businessType) redirect('/onboarding'); // must complete step 1 first

  const connected = await db.query.dataSources.findMany({
    where: and(
      eq(dataSources.orgId, orgId),
      ne(dataSources.status, 'inactive')
    ),
    columns: { connectionConfig: false },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Connect your tools</h1>
        <p className="text-muted-foreground mt-2">
          Connect at least one source. You can add more later in Settings.
        </p>
      </div>
      <ConnectSourcesForm connected={connected} />
    </div>
  );
}
