import {
  pgTable, text, boolean, integer,
  timestamp, jsonb, unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import {
  fieldStatusEnum, fieldTypologyEnum,
  fieldDataTypeEnum, sourceDirectionEnum, conflictRuleEnum,
} from './enums';
import { orgs } from './orgs';

export const udmFields = pgTable('udm_fields', {
  id:           text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId:        text('org_id').notNull().references(() => orgs.id),

  // Identity
  fieldKey:     text('field_key').notNull(),
  displayName:  text('display_name').notNull(),
  description:  text('description'),

  // Classification
  typology:     fieldTypologyEnum('typology').notNull(),
  dataType:     fieldDataTypeEnum('data_type').notNull(),

  // Lifecycle
  status:       fieldStatusEnum('status').default('proposed').notNull(),
  version:      integer('version').default(1).notNull(),

  // AI metadata
  aiSuggested:  boolean('ai_suggested').default(false).notNull(),
  aiRationale:  text('ai_rationale'),

  // Approval
  approvedBy:   text('approved_by'),
  approvedAt:   timestamp('approved_at'),

  // Deprecation
  supersededBy: text('superseded_by'),

  // Timestamps
  createdAt:    timestamp('created_at').defaultNow().notNull(),
  updatedAt:    timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueFieldKey: unique().on(table.orgId, table.fieldKey),
}));

export const udmFieldVersions = pgTable('udm_field_versions', {
  id:                text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  fieldId:           text('field_id').notNull().references(() => udmFields.id),
  orgId:             text('org_id').notNull().references(() => orgs.id),
  version:           integer('version').notNull(),
  schemaSnapshot:    jsonb('schema_snapshot').notNull(),
  changeDescription: text('change_description'),
  changedBy:         text('changed_by').notNull(),
  createdAt:         timestamp('created_at').defaultNow().notNull(),
});

export const udmFieldSources = pgTable('udm_field_sources', {
  id:              text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  fieldId:         text('field_id').notNull().references(() => udmFields.id),
  orgId:           text('org_id').notNull().references(() => orgs.id),
  sourceType:      text('source_type').notNull(),
  sourceFieldPath: text('source_field_path').notNull(),
  direction:       sourceDirectionEnum('direction').default('read').notNull(),
  isMaster:        boolean('is_master').default(false).notNull(),
  conflictRule:    conflictRuleEnum('conflict_rule').default('master_wins').notNull(),
  createdAt:       timestamp('created_at').defaultNow().notNull(),
});

// Relations — defined after all tables to avoid forward-reference issues

export const udmFieldsRelations = relations(udmFields, ({ one, many }) => ({
  org:      one(orgs, { fields: [udmFields.orgId], references: [orgs.id] }),
  versions: many(udmFieldVersions),
  sources:  many(udmFieldSources),
}));

export const udmFieldVersionsRelations = relations(udmFieldVersions, ({ one }) => ({
  field: one(udmFields, { fields: [udmFieldVersions.fieldId], references: [udmFields.id] }),
}));

export const udmFieldSourcesRelations = relations(udmFieldSources, ({ one }) => ({
  field: one(udmFields, { fields: [udmFieldSources.fieldId], references: [udmFields.id] }),
}));

export type UdmField    = typeof udmFields.$inferSelect;
export type NewUdmField = typeof udmFields.$inferInsert;
