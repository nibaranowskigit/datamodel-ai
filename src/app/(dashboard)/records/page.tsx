import { orgGuard } from '@/lib/auth';
import { db } from '@/lib/db';
import { udmRecords, cdmRecords, orgs } from '@/lib/db/schema';
import { and, eq, isNull, ilike, or, desc, count, sql } from 'drizzle-orm';
import { RecordsBrowser } from '@/components/records/records-browser';
import { redirect } from 'next/navigation';

function sanitizeIlikeFragment(q: string): string {
  return q.trim().slice(0, 200).replace(/[%_\\]/g, '');
}

export default async function RecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; tab?: string }>;
}) {
  const sp = await searchParams;
  const { orgId } = await orgGuard();
  const query = sp.q ?? '';
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const tabParam = sp.tab === 'companies' ? 'companies' : 'users';
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  const org = await db.query.orgs.findFirst({
    where: eq(orgs.id, orgId),
    columns: { businessType: true },
  });
  const isB2B = org?.businessType === 'b2b';

  if (tabParam === 'companies' && !isB2B) {
    redirect('/records?tab=users');
  }

  if (tabParam === 'users') {
    const baseWhere = and(eq(udmRecords.orgId, orgId), isNull(udmRecords.aliasOfId));
    const safe = sanitizeIlikeFragment(query);
    const searchWhere =
      safe.length > 0
        ? and(
            baseWhere,
            or(
              ilike(udmRecords.email, `%${safe}%`),
              sql`${udmRecords.data}::text ilike ${'%' + safe + '%'}`,
            ),
          )
        : baseWhere;

    const [rows, countRow] = await Promise.all([
      db.query.udmRecords.findMany({
        where: searchWhere,
        orderBy: [desc(udmRecords.updatedAt)],
        limit: pageSize,
        offset,
        columns: {
          id: true,
          email: true,
          data: true,
          updatedAt: true,
        },
      }),
      db.select({ total: count() }).from(udmRecords).where(searchWhere),
    ]);

    const total = Number(countRow[0]?.total ?? 0);
    const hasMore = offset + pageSize < total;
    const hasPrev = page > 1;

    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Records</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse your unified data model — contacts and companies across all sources.
          </p>
        </div>

        <RecordsBrowser
          activeTab="users"
          isB2B={isB2B}
          query={query}
          page={page}
          users={{
            records: rows.map((r) => ({
              id: r.id,
              email: r.email,
              data: (r.data ?? {}) as Record<string, unknown>,
              updatedAt: r.updatedAt.toISOString(),
            })),
            total,
            hasMore,
            hasPrev,
          }}
          companies={null}
        />
      </div>
    );
  }

  const baseWhere = eq(cdmRecords.orgId, orgId);
  const safe = sanitizeIlikeFragment(query);
  const searchWhere =
    safe.length > 0
      ? and(
          baseWhere,
          or(
            ilike(cdmRecords.name, `%${safe}%`),
            ilike(cdmRecords.domain, `%${safe}%`),
            sql`${cdmRecords.data}::text ilike ${'%' + safe + '%'}`,
          ),
        )
      : baseWhere;

  const [rows, countRow] = await Promise.all([
    db.query.cdmRecords.findMany({
      where: searchWhere,
      orderBy: [desc(cdmRecords.updatedAt)],
      limit: pageSize,
      offset,
      columns: {
        id: true,
        name: true,
        domain: true,
        data: true,
        updatedAt: true,
      },
    }),
    db.select({ total: count() }).from(cdmRecords).where(searchWhere),
  ]);

  const total = Number(countRow[0]?.total ?? 0);
  const hasMore = offset + pageSize < total;
  const hasPrev = page > 1;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Records</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse your unified data model — contacts and companies across all sources.
        </p>
      </div>

      <RecordsBrowser
        activeTab="companies"
        isB2B={isB2B}
        query={query}
        page={page}
        users={null}
        companies={{
          records: rows.map((r) => ({
            id: r.id,
            name: r.name,
            domain: r.domain,
            data: (r.data ?? {}) as Record<string, unknown>,
            updatedAt: r.updatedAt.toISOString(),
          })),
          total,
          hasMore,
          hasPrev,
        }}
      />
    </div>
  );
}
