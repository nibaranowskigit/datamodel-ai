import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';

export const apiKeys = pgTable('api_keys', {
  id:         text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId:      text('org_id').notNull().references(() => orgs.id),
  name:       text('name').notNull(),
  keyPrefix:  text('key_prefix').notNull(),
  keyHash:    text('key_hash').notNull(),
  scopes:     text('scopes').array().notNull().default([]),
  createdBy:  text('created_by').notNull(),
  lastUsedAt: timestamp('last_used_at'),
  revokedAt:  timestamp('revoked_at'),
  createdAt:  timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  orgIdIdx:   index('api_keys_org_id_idx').on(table.orgId),
  keyHashIdx: index('api_keys_key_hash_idx').on(table.keyHash),
}));

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
