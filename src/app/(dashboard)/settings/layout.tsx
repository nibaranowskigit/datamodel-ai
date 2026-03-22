import { orgGuard } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { SettingsNav } from '@/components/settings/settings-nav';

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await orgGuard();
  const isAdmin = await hasRole('org:admin');

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your workspace configuration.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-48 flex-shrink-0">
          <SettingsNav isAdmin={isAdmin} />
        </aside>

        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
