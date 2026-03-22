import { orgGuard } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { db } from '@/lib/db';
import { orgs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { OrgProfileForm } from '@/components/settings/org-profile-form';
import { OrgProfileReadOnly } from '@/components/settings/org-profile-read-only';

export default async function ProfilePage() {
  const { orgId } = await orgGuard();
  const isAdmin = await hasRole('org:admin');

  const org = await db.query.orgs.findFirst({
    where: eq(orgs.id, orgId),
    columns: {
      name:         true,
      businessType: true,
      vertical:     true,
      stage:        true,
    },
  });

  if (!org) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Organisation profile</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Update your workspace name and business context.
        </p>
      </div>

      {isAdmin ? (
        <OrgProfileForm org={org} />
      ) : (
        <OrgProfileReadOnly org={org} />
      )}
    </div>
  );
}
