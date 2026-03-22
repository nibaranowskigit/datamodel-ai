import { orgGuard } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { db } from '@/lib/db';
import { apiKeys } from '@/lib/db/schema';
import { and, eq, isNull, desc } from 'drizzle-orm';
import { ApiKeysList } from '@/components/settings/api-keys-list';

export default async function ApiKeysPage() {
  const { orgId } = await orgGuard();
  const isAdmin = await hasRole('org:admin');

  const keys = await db.query.apiKeys.findMany({
    where: and(
      eq(apiKeys.orgId, orgId),
      isNull(apiKeys.revokedAt)
    ),
    orderBy: [desc(apiKeys.createdAt)],
    columns: {
      keyHash: false,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">API Keys</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Keys grant AI agents read access to your data model.
          Treat them like passwords — never commit to source control.
        </p>
      </div>
      <ApiKeysList keys={keys} isAdmin={isAdmin} />
    </div>
  );
}
