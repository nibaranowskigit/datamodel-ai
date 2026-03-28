import {
  pgTable, text, timestamp,
  jsonb, real, unique,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { orgs } from './orgs';

// ─── UDM Records ────────────────────────────────────────────
// One canonical user/person record per org
// Applies to ALL orgs (B2B and B2C)

export const udmRecords = pgTable('udm_records', {
  id:             text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId:          text('org_id').notNull().references(() => orgs.id),
  externalUserId: text('external_user_id').notNull(),
  email:          text('email'),
  data:           jsonb('data').default({}).notNull(),
  fillRate:       real('fill_rate').default(0).notNull(),
  aliasOfId:      text('alias_of_id').references((): AnyPgColumn => udmRecords.id),
  createdAt:      timestamp('created_at').defaultNow().notNull(),
  updatedAt:      timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueExternalUser: unique().on(table.orgId, table.externalUserId),
}));

export const udmRecordsRelations = relations(udmRecords, ({ one, many }) => ({
  org:         one(orgs, { fields: [udmRecords.orgId], references: [orgs.id] }),
  fieldValues: many(udmFieldValues),
}));

// ─── CDM Records ────────────────────────────────────────────
// One canonical company record per org
// B2B ONLY — enforced at server action layer

export const cdmRecords = pgTable('cdm_records', {
  id:                text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId:             text('org_id').notNull().references(() => orgs.id),
  externalCompanyId: text('external_company_id').notNull(),
  domain:            text('domain'),
  name:              text('name'),
  data:              jsonb('data').default({}).notNull(),
  fillRate:          real('fill_rate').default(0).notNull(),
  createdAt:         timestamp('created_at').defaultNow().notNull(),
  updatedAt:         timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueExternalCompany: unique().on(table.orgId, table.externalCompanyId),
}));

export const cdmRecordsRelations = relations(cdmRecords, ({ one, many }) => ({
  org:         one(orgs, { fields: [cdmRecords.orgId], references: [orgs.id] }),
  fieldValues: many(cdmFieldValues),
}));

// ─── UDM Field Values ────────────────────────────────────────
// One row per field_key per UDM record
// Source-attributed — knows where each value came from

export const udmFieldValues = pgTable('udm_field_values', {
  id:            text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  recordId:      text('record_id').notNull().references(() => udmRecords.id, { onDelete: 'cascade' }),
  orgId:         text('org_id').notNull().references(() => orgs.id),
  fieldKey:      text('field_key').notNull(),
  value:         jsonb('value'),
  sourceType:    text('source_type').notNull(),
  confidence:    real('confidence').default(1.0).notNull(),
  previousValue: jsonb('previous_value'),
  syncedAt:      timestamp('synced_at').defaultNow().notNull(),
}, (table) => ({
  uniqueFieldPerRecord: unique().on(table.recordId, table.fieldKey),
}));

export const udmFieldValuesRelations = relations(udmFieldValues, ({ one }) => ({
  record: one(udmRecords, { fields: [udmFieldValues.recordId], references: [udmRecords.id] }),
}));

// ─── CDM Field Values ────────────────────────────────────────
// One row per field_key per CDM record

export const cdmFieldValues = pgTable('cdm_field_values', {
  id:            text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  recordId:      text('record_id').notNull().references(() => cdmRecords.id, { onDelete: 'cascade' }),
  orgId:         text('org_id').notNull().references(() => orgs.id),
  fieldKey:      text('field_key').notNull(),
  value:         jsonb('value'),
  sourceType:    text('source_type').notNull(),
  confidence:    real('confidence').default(1.0).notNull(),
  previousValue: jsonb('previous_value'),
  syncedAt:      timestamp('synced_at').defaultNow().notNull(),
}, (table) => ({
  uniqueFieldPerRecord: unique().on(table.recordId, table.fieldKey),
}));

export const cdmFieldValuesRelations = relations(cdmFieldValues, ({ one }) => ({
  record: one(cdmRecords, { fields: [cdmFieldValues.recordId], references: [cdmRecords.id] }),
}));

// Types
export type UdmRecord     = typeof udmRecords.$inferSelect;
export type CdmRecord     = typeof cdmRecords.$inferSelect;
export type UdmFieldValue = typeof udmFieldValues.$inferSelect;
export type CdmFieldValue = typeof cdmFieldValues.$inferSelect;
