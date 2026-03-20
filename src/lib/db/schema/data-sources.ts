import { pgTable, text, timestamp, pgEnum, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { orgs } from './orgs';

export const sourceStatusEnum = pgEnum('source_status', [
  'pending',   // connected, not yet synced
  'active',    // synced at least once successfully
  'error',     // last sync failed
  'inactive',  // disconnected — soft deleted
]);

export const sourceTypeEnum = pgEnum('source_type', [
  'hubspot',
  'stripe',
  'intercom',
  'mixpanel',
  // Phase 2
  'salesforce',
  'vitally',
  'amplitude',
  'posthog',
  'bigquery',
  'snowflake',
]);

export const dataSources = pgTable('data_sources', {
  id:               text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId:            text('org_id').notNull().references(() => orgs.id),
  sourceType:       sourceTypeEnum('source_type').notNull(),
  displayName:      text('display_name').notNull(),
  connectionConfig: text('connection_config'),       // AES-256-GCM encrypted JSON string
  status:           sourceStatusEnum('status').default('pending').notNull(),
  lastSyncAt:       timestamp('last_sync_at'),
  lastSyncError:    text('last_sync_error'),
  createdBy:        text('created_by').notNull(),    // Clerk userId
  createdAt:        timestamp('created_at').defaultNow().notNull(),
  updatedAt:        timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // One active source per (org, source_type) — prevents duplicate connections
  uniqueActiveSource: unique().on(table.orgId, table.sourceType),
}));

export const dataSourcesRelations = relations(dataSources, ({ one }) => ({
  org: one(orgs, { fields: [dataSources.orgId], references: [orgs.id] }),
}));

export type DataSource    = typeof dataSources.$inferSelect;
export type NewDataSource = typeof dataSources.$inferInsert;
