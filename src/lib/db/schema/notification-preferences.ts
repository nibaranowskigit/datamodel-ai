import { pgTable, text, boolean, timestamp, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { orgs } from './orgs';

export const notificationPreferences = pgTable('notification_preferences', {
  id:        text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId:    text('user_id').notNull(),
  orgId:     text('org_id').notNull().references(() => orgs.id),
  type:      text('type').notNull(),
  enabled:   boolean('enabled').notNull().default(true),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueUserOrgType: unique().on(table.userId, table.orgId, table.type),
}));

export const notificationPreferencesRelations = relations(
  notificationPreferences,
  ({ one }) => ({
    org: one(orgs, {
      fields: [notificationPreferences.orgId],
      references: [orgs.id],
    }),
  })
);

export type NotificationPreference    = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreference = typeof notificationPreferences.$inferInsert;
