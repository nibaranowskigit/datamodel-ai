import { pgTable, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const businessTypeEnum = pgEnum('business_type', ['b2b', 'b2c']);
export const orgPlanEnum = pgEnum('org_plan', ['free', 'starter', 'growth']);
export const orgStatusEnum = pgEnum('org_status', ['active', 'inactive']);

export const orgs = pgTable('orgs', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  businessType: businessTypeEnum('business_type'),
  vertical: text('vertical'),
  stage: text('stage'),
  plan: orgPlanEnum('plan').default('free').notNull(),
  status: orgStatusEnum('status').default('active').notNull(),
  clerkOrgId: text('clerk_org_id').notNull().unique(),
  stripeCustomerId: text('stripe_customer_id').unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Org = typeof orgs.$inferSelect;
export type NewOrg = typeof orgs.$inferInsert;
