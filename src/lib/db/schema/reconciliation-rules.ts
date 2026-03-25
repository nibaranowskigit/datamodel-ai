import { pgTable, text, integer, timestamp, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { orgs } from './orgs';

// Per-org master source priority per field namespace.
// Lower number = higher priority (1 = master source).
// Seeded per org via seedReconciliationRules() on org creation (AUTH.3).
export const reconciliationRules = pgTable('reconciliation_rules', {
  id:         text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId:      text('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  namespace:  text('namespace').notNull(),   // 'HS_' | 'FIN_' | 'SUP_' | 'PROD_' | '*'
  sourceType: text('source_type').notNull(), // 'hubspot' | 'stripe' | 'intercom' | 'mixpanel'
  priority:   integer('priority').notNull(), // 1 = highest priority
  updatedAt:  timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueOrgNamespaceSource: unique().on(table.orgId, table.namespace, table.sourceType),
}));

export const reconciliationRulesRelations = relations(reconciliationRules, ({ one }) => ({
  org: one(orgs, { fields: [reconciliationRules.orgId], references: [orgs.id] }),
}));

export type ReconciliationRule    = typeof reconciliationRules.$inferSelect;
export type NewReconciliationRule = typeof reconciliationRules.$inferInsert;
