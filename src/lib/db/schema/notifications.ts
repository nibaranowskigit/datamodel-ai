import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { orgs } from './orgs';

export const notifications = pgTable('notifications', {
  id:        text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId:     text('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  userId:    text('user_id').notNull(),
  type:      text('type').notNull(),
  title:     text('title').notNull(),
  body:      text('body').notNull(),
  link:      text('link'),
  readAt:    timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userOrgIdx: index('notif_user_org_idx').on(table.userId, table.orgId),
  unreadIdx:  index('notif_unread_idx').on(table.userId, table.readAt),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  org: one(orgs, {
    fields: [notifications.orgId],
    references: [orgs.id],
  }),
}));

export type Notification    = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
