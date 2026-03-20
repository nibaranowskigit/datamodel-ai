import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const { userId, orgId } = await auth();

  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/create-org');

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Datamodel.ai</h1>
      <p className="text-muted-foreground mt-2">Dashboard</p>
      <pre className="mt-4 text-sm bg-muted p-4 rounded">
        {JSON.stringify({ orgId, userId }, null, 2)}
      </pre>
    </div>
  );
}
