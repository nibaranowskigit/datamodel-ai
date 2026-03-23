import { pgTable, text, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { orgs } from './orgs';
import { syncLogs } from './sync-logs';

export const syncRuns = pgTable(
  'sync_runs',
  {
    id:          text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    orgId:       text('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
    status:      text('status').notNull().default('pending'),
    // 'pending' | 'running' | 'completed' | 'partial' | 'failed'
    startedAt:   timestamp('started_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
    sourcesTotal:   integer('sources_total').notNull().default(0),
    sourcesSuccess: integer('sources_success').notNull().default(0),
    sourcesFailed:  integer('sources_failed').notNull().default(0),
  },
  (table) => [
    index('sync_runs_org_idx').on(table.orgId),
  ]
);

export const syncRunsRelations = relations(syncRuns, ({ one, many }) => ({
  org:      one(orgs,      { fields: [syncRuns.orgId], references: [orgs.id] }),
  syncLogs: many(syncLogs),
}));

export type SyncRun    = typeof syncRuns.$inferSelect;
export type NewSyncRun = typeof syncRuns.$inferInsert;
