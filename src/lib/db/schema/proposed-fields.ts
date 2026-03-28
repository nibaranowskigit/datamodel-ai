import {
  pgTable, text, timestamp, real, jsonb, unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { orgs } from './orgs';
import { syncRuns } from './sync-runs';

/** AI-suggested fields awaiting human approval — S2.0. Distinct from udm_fields until promoted. */
export const proposedFields = pgTable(
  'proposed_fields',
  {
    id:               text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    orgId:            text('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
    fieldKey:         text('field_key').notNull(),
    label:            text('label').notNull(),
    dataType:         text('data_type').notNull(),
    enumValues:       jsonb('enum_values').$type<string[]>().default([]).notNull(),
    description:      text('description').notNull(),
    sourceEvidence:   text('source_evidence').notNull(),
    confidence:       real('confidence').notNull(),
    rationale:        text('rationale').notNull(),
    syncRunId:        text('sync_run_id').references(() => syncRuns.id, { onDelete: 'set null' }),
    modelType:        text('model_type').default('udm').notNull(),
    status:           text('status').default('proposed').notNull(),
    approvedBy:       text('approved_by'),
    approvedAt:       timestamp('approved_at'),
    rejectedBy:       text('rejected_by'),
    rejectedAt:       timestamp('rejected_at'),
    createdAt:        timestamp('created_at').defaultNow().notNull(),
    updatedAt:        timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    uniqueOrgFieldKey: unique().on(table.orgId, table.fieldKey),
  }),
);

export const proposedFieldsRelations = relations(proposedFields, ({ one }) => ({
  org:     one(orgs,     { fields: [proposedFields.orgId], references: [orgs.id] }),
  syncRun: one(syncRuns, { fields: [proposedFields.syncRunId], references: [syncRuns.id] }),
}));

export type ProposedField    = typeof proposedFields.$inferSelect;
export type NewProposedField = typeof proposedFields.$inferInsert;
