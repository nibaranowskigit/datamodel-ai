import { pgTable, text, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { orgs } from './orgs';

export const syncStatusEnum = pgEnum('sync_status', [
  'running',
  'success',
  'error',
  'partial',
]);

export const syncLogs = pgTable('sync_logs', {
  id:              text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId:           text('org_id').notNull().references(() => orgs.id),
  sourceType:      text('source_type').notNull(),
  status:          syncStatusEnum('status').notNull(),
  recordsUpserted: integer('records_upserted').default(0),
  fieldsUpdated:   integer('fields_updated').default(0),
  errorMessage:    text('error_message'),
  durationMs:      integer('duration_ms'),
  startedAt:       timestamp('started_at').defaultNow().notNull(),
  completedAt:     timestamp('completed_at'),
});

export const syncLogsRelations = relations(syncLogs, ({ one }) => ({
  org: one(orgs, { fields: [syncLogs.orgId], references: [orgs.id] }),
}));

export type SyncLog    = typeof syncLogs.$inferSelect;
export type NewSyncLog = typeof syncLogs.$inferInsert;
