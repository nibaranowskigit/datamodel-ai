'use client';

import { cn } from '@/lib/utils';

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

function Initials({ email }: { email: string }) {
  const local = email.split('@')[0]?.replace(/[._-]/g, ' ') ?? '';
  const parts = local.split(/\s+/).filter(Boolean);
  const init =
    parts.length >= 2
      ? `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`
      : local.slice(0, 2);
  return (
    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
      <span className="text-xs font-medium text-primary uppercase">{init || '—'}</span>
    </div>
  );
}

export type UserRecordListItem = {
  id: string;
  email: string | null;
  data: Record<string, unknown>;
  updatedAt: string;
};

export function RecordRow({
  record,
  onClick,
}: {
  record: UserRecordListItem;
  onClick: () => void;
}) {
  const fields = record.data ?? {};
  const company = fields.HS_company as string | null | undefined;
  const status = fields.FIN_subscription_status as string | null | undefined;
  const mrr = fields.FIN_mrr as number | null | undefined;

  const sources = [
    ...new Set(
      Object.keys(fields)
        .map(sourceFromFieldKey)
        .filter((s): s is string => s != null),
    ),
  ];

  return (
    <div
      role="button"
      tabIndex={0}
      className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors duration-150 ease cursor-pointer"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Initials email={record.email ?? ''} />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{record.email ?? '—'}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {company != null && company !== '' && (
              <span className="text-xs text-muted-foreground truncate">{company}</span>
            )}
            {status != null && status !== '' && (
              <span
                className={cn(
                  'text-xs px-1.5 py-0.5 rounded border',
                  status === 'active'
                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                    : status === 'trialing'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-red-500/10 text-red-400 border-red-500/20',
                )}
              >
                {status}
              </span>
            )}
            {mrr != null && mrr > 0 && (
              <span className="text-xs text-muted-foreground">
                ${(mrr / 100).toFixed(0)}/mo
              </span>
            )}
          </div>
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
