import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { orgs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { countOpenConflicts } from '@/lib/conflicts/open-count';
import { DashboardNav } from '@/components/dashboard/nav';
import { UserAvatarButton } from '@/components/dashboard/user-avatar-button';
import { Toaster } from '@/components/ui/sonner';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect('/sign-in');

  const [org, openConflictCount] = await Promise.all([
    db.query.orgs.findFirst({
      where: eq(orgs.id, orgId),
    }),
    countOpenConflicts(orgId),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="h-12 border-b border-border bg-card flex items-center px-5 shrink-0 gap-3">
        <div className="flex items-center gap-2">
          <div className="size-3.5 rounded-sm bg-primary" />
          <span className="text-sm font-semibold tracking-tight">Datamodel.ai</span>
        </div>
        {org && (
          <>
            <span className="text-border">·</span>
            <span className="text-xs text-muted-foreground font-mono">{org.name}</span>
          </>
        )}
        <div className="ml-auto flex items-center">
          <UserAvatarButton />
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-48 border-r border-border bg-card shrink-0 flex flex-col">
          <DashboardNav openConflictCount={openConflictCount} />
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}
