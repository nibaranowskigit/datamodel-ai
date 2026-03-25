import { db } from '@/lib/db';
import { reconciliationRules } from '@/lib/db/schema';

// Default master source priority rules seeded for every new org.
// Lower priority number = authoritative source for that field namespace.
const DEFAULT_RULES = [
  // Contact/CRM fields — HubSpot is master
  { namespace: 'HS_',   sourceType: 'hubspot',  priority: 1 },
  { namespace: 'HS_',   sourceType: 'stripe',   priority: 2 },
  { namespace: 'HS_',   sourceType: 'intercom', priority: 3 },
  { namespace: 'HS_',   sourceType: 'mixpanel', priority: 4 },
  // Financial fields — Stripe is master
  { namespace: 'FIN_',  sourceType: 'stripe',   priority: 1 },
  { namespace: 'FIN_',  sourceType: 'hubspot',  priority: 2 },
  { namespace: 'FIN_',  sourceType: 'intercom', priority: 3 },
  { namespace: 'FIN_',  sourceType: 'mixpanel', priority: 4 },
  // Support fields — Intercom is master
  { namespace: 'SUP_',  sourceType: 'intercom', priority: 1 },
  { namespace: 'SUP_',  sourceType: 'hubspot',  priority: 2 },
  { namespace: 'SUP_',  sourceType: 'stripe',   priority: 3 },
  { namespace: 'SUP_',  sourceType: 'mixpanel', priority: 4 },
  // Product/analytics fields — Mixpanel is master
  { namespace: 'PROD_', sourceType: 'mixpanel', priority: 1 },
  { namespace: 'PROD_', sourceType: 'hubspot',  priority: 2 },
  { namespace: 'PROD_', sourceType: 'stripe',   priority: 3 },
  { namespace: 'PROD_', sourceType: 'intercom', priority: 4 },
];

export async function seedReconciliationRules(orgId: string): Promise<void> {
  await db
    .insert(reconciliationRules)
    .values(DEFAULT_RULES.map((r) => ({ ...r, orgId })))
    .onConflictDoNothing();
}
