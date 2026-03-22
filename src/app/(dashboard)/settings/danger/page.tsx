import { orgGuard } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { orgs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { DangerZoneActions } from '@/components/settings/danger-zone-actions';

export default async function DangerPage() {
  const { orgId } = await orgGuard();
  const isAdmin = await hasRole('org:admin');
  if (!isAdmin) redirect('/settings/profile');

  const org = await db.query.orgs.findFirst({
    where: eq(orgs.id, orgId),
    columns: { name: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-destructive">Danger zone</h2>
        <p className="text-sm text-muted-foreground mt-1">
          These actions are irreversible. Read carefully before proceeding.
        </p>
      </div>
      <DangerZoneActions orgName={org?.name ?? 'your organisation'} />
    </div>
  );
}
