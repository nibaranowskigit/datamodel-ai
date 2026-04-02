'use client';

function sourceFromFieldKey(k: string): string | null {
  if (k.startsWith('HS_')) return 'hubspot';
  if (k.startsWith('FIN_')) return 'stripe';
  if (k.startsWith('SUP_')) return 'intercom';
  if (k.startsWith('PROD_')) return 'mixpanel';
  return null;
}

const SOURCE_ABBR: Record<string, string> = {
  hubspot: 'HS',
  stripe: 'ST',
  intercom: 'IC',
  mixpanel: 'MP',
};

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const init =
    parts.length >= 2
      ? `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`
      : name.slice(0, 2);
  return (
    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
      <span className="text-xs font-medium text-primary uppercase">{init || '—'}</span>
    </div>
  );
}

export type CompanyRecordListItem = {
  id: string;
  name: string | null;
  domain: string | null;
  data: Record<string, unknown>;
  updatedAt: string;
};

export function CompanyRecordRow({ record }: { record: CompanyRecordListItem }) {
  const fields = record.data ?? {};
  const label = record.name?.trim() || record.domain || 'Unnamed company';
  const sources = [
    ...new Set(
      Object.keys(fields)
        .map(sourceFromFieldKey)
        .filter((s): s is string => s != null),
    ),
  ];

  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors duration-150 ease">
      <div className="flex items-center gap-3 min-w-0">
        <Initials name={label} />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{record.name?.trim() || '—'}</p>
          {record.domain != null && record.domain !== '' && (
            <p className="text-xs text-muted-foreground truncate mt-0.5 font-mono">
              {record.domain}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-4">
        {sources.map((src) => (
          <span
            key={src}
            className="text-xs px-1.5 py-0.5 rounded border font-medium bg-muted/50 text-muted-foreground border-border"
          >
            {SOURCE_ABBR[src] ?? src.slice(0, 2).toUpperCase()}
          </span>
        ))}
        <span className="text-xs text-muted-foreground hidden sm:block tabular-nums">
          {record.updatedAt
            ? new Date(record.updatedAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
              })
            : '—'}
        </span>
      </div>
    </div>
  );
}
