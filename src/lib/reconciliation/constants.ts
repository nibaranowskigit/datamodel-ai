/** Field-key prefixes used for master-source resolution (S1.5). */
export const RECONCILIATION_NAMESPACES = ['HS_', 'FIN_', 'SUP_', 'PROD_'] as const;
export type ReconciliationNamespace = (typeof RECONCILIATION_NAMESPACES)[number];

/** Tier-1 connector types that participate in reconciliation. */
export const RECONCILIATION_SOURCE_TYPES = ['hubspot', 'stripe', 'intercom', 'mixpanel'] as const;
export type ReconciliationSourceType = (typeof RECONCILIATION_SOURCE_TYPES)[number];
