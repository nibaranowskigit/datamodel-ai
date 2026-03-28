import { pgTable, text, real, timestamp, boolean, index, unique } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';

export const identityMatches = pgTable(
  'identity_matches',
  {
    id:              text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    orgId:           text('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
    primaryRecordId: text('primary_record_id').notNull(),
    aliasRecordId:   text('alias_record_id').notNull(),
    matchRule:       text('match_rule').notNull(),
    confidence:      real('confidence').notNull(),
    autoMerged:      boolean('auto_merged').notNull().default(false),
    createdAt:       timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    orgPrimaryIdx: index('identity_primary_idx').on(table.orgId, table.primaryRecordId),
    orgAliasIdx:   index('identity_alias_idx').on(table.orgId, table.aliasRecordId),
    orgPrimaryAliasUnique: unique('identity_matches_org_primary_alias_unique').on(
      table.orgId,
      table.primaryRecordId,
      table.aliasRecordId,
    ),
  }),
);

export const identityReviewQueue = pgTable(
  'identity_review_queue',
  {
    id:         text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    orgId:      text('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
    recordIdA:  text('record_id_a').notNull(),
    recordIdB:  text('record_id_b').notNull(),
    matchRule:  text('match_rule').notNull(),
    confidence: real('confidence').notNull(),
    evidenceA:  text('evidence_a'),
    evidenceB:  text('evidence_b'),
    status:     text('status').notNull().default('pending'),
    resolvedBy: text('resolved_by'),
    resolvedAt: timestamp('resolved_at'),
    suppressed: boolean('suppressed').notNull().default(false),
    createdAt:  timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    orgStatusIdx: index('identity_queue_org_status_idx').on(table.orgId, table.status),
    orgPairUnique: unique('identity_review_queue_org_pair_unique').on(
      table.orgId,
      table.recordIdA,
      table.recordIdB,
    ),
  }),
);

export type IdentityMatch = typeof identityMatches.$inferSelect;
export type IdentityReviewItem = typeof identityReviewQueue.$inferSelect;
