'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RecordRow, type UserRecordListItem } from './record-row';
import { CompanyRecordRow, type CompanyRecordListItem } from './company-record-row';

type TabBundle<T> = {
  records: T[];
  total: number;
  hasMore: boolean;
  hasPrev: boolean;
};

export function RecordsBrowser({
  activeTab,
  isB2B,
  query,
  page,
  users,
  companies,
}: {
  activeTab: 'users' | 'companies';
  isB2B: boolean;
  query: string;
  page: number;
  users: TabBundle<UserRecordListItem> | null;
  companies: TabBundle<CompanyRecordListItem> | null;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function navigate(next: Record<string, string>) {
    const sp = new URLSearchParams(next);
    router.push(`${pathname}?${sp.toString()}`);
  }

  const bundle = activeTab === 'users' ? users : companies;
  const total = bundle?.total ?? 0;
  const records = bundle?.records ?? [];
  const hasMore = bundle?.hasMore ?? false;
  const hasPrev = bundle?.hasPrev ?? false;

  const searchPlaceholder =
    activeTab === 'users' ? 'Search by email or name…' : 'Search by name or domain…';

  return (
    <div className="space-y-4">
      {isB2B ? (
        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            const tab = v === 'companies' ? 'companies' : 'users';
            navigate({ q: query, page: '1', tab });
          }}
        >
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="companies">Companies</TabsTrigger>
          </TabsList>
        </Tabs>
      ) : null}

      <div className="flex gap-3 items-center">
        <Input
          placeholder={searchPlaceholder}
          defaultValue={query}
          className="h-9 max-w-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const v = (e.target as HTMLInputElement).value;
              navigate({
                q: v,
                page: '1',
                tab: activeTab,
              });
            }
          }}
        />
        <span className="text-sm text-muted-foreground">
          {total.toLocaleString()} record{total !== 1 ? 's' : ''}
        </span>
      </div>

      {records.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {query
              ? `No records matching "${query}".`
              : activeTab === 'users'
                ? 'No records yet. Run a sync to populate your data model.'
                : 'No companies yet. Run a sync to populate your CDM.'}
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">
          {activeTab === 'users'
            ? (records as UserRecordListItem[]).map((record) => (
                <RecordRow
                  key={record.id}
                  record={record}
                  onClick={() => router.push(`/records/users/${record.id}`)}
                />
              ))
            : (records as CompanyRecordListItem[]).map((record) => (
                <CompanyRecordRow key={record.id} record={record} />
              ))}
        </div>
      )}

      {(hasPrev || hasMore) && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={!hasPrev}
            onClick={() =>
              navigate({ q: query, page: String(page - 1), tab: activeTab })
            }
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasMore}
            onClick={() =>
              navigate({ q: query, page: String(page + 1), tab: activeTab })
            }
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
