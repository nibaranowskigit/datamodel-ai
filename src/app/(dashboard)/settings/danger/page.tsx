import { orgGuard } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { redirect } from 'next/navigation';

export default async function DangerPage() {
  await orgGuard();
  const isAdmin = await hasRole('org:admin');
  if (!isAdmin) redirect('/settings/profile');

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-destructive">
          Danger zone
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Irreversible actions. Proceed with caution.
        </p>
      </div>
      <p className="text-sm text-muted-foreground">Coming in SETTINGS.6.</p>
    </div>
  );
}
