import { pgTable, text, timestamp, boolean, index, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { orgs } from './orgs';
import { udmRecords } from './records';

// Detected disagreements between two sources on the same UDM field.
// Created by reconcileUDMRecords() after every multi-source sync (S1.5).
// Resolved by Admin/Member via /conflicts UI.
export const cdmConflicts = pgTable('cdm_conflicts', {
  id:             text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId:          text('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  udmRecordId:    text('udm_record_id').notNull().references(() => udmRecords.id, { onDelete: 'cascade' }),
  fieldKey:       text('field_key').notNull(),
  // Source A
  sourceTypeA:    text('source_type_a').notNull(),
  valueA:         text('value_a'),
  // Source B
  sourceTypeB:    text('source_type_b').notNull(),
  valueB:         text('value_b'),
  // Resolution
  resolvedAt:     timestamp('resolved_at'),
  resolvedBy:     text('resolved_by'),     // Clerk userId
  resolvedValue:  text('resolved_value'),
  resolvedSource: text('resolved_source'),
  // Auto-resolution
  autoResolved:   boolean('auto_resolved').default(false).notNull(),
  createdAt:      timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniqueOrgRecordField:  unique('conflicts_org_record_field_key').on(table.orgId, table.udmRecordId, table.fieldKey),
  orgUnresolvedIdx:      index('conflicts_org_unresolved_idx').on(table.orgId, table.resolvedAt),
  udmRecordIdx:          index('conflicts_udm_record_idx').on(table.udmRecordId),
}));

export const cdmConflictsRelations = relations(cdmConflicts, ({ one }) => ({
  org:       one(orgs,        { fields: [cdmConflicts.orgId],       references: [orgs.id] }),
  udmRecord: one(udmRecords,  { fields: [cdmConflicts.udmRecordId], references: [udmRecords.id] }),
}));

export type CDMConflict    = typeof cdmConflicts.$inferSelect;
export type NewCDMConflict = typeof cdmConflicts.$inferInsert;
