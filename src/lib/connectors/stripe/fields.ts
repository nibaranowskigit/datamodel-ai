export type FieldDefinition = {
  fieldKey: string;
  label: string;
  sourceType: string;
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'enum';
  enumValues?: string[];
  description: string;
};

// UDM fields — per-customer financial data
export const STRIPE_UDM_FIELDS: FieldDefinition[] = [
  {
    fieldKey:    'FIN_subscription_status',
    label:       'Subscription status',
    sourceType:  'stripe',
    dataType:    'enum',
    enumValues:  ['active', 'trialing', 'past_due', 'cancelled', 'paused'],
    description: 'Current Stripe subscription status',
  },
  {
    fieldKey:    'FIN_plan_name',
    label:       'Plan name',
    sourceType:  'stripe',
    dataType:    'string',
    description: 'Name of the active Stripe price/plan',
  },
  {
    fieldKey:    'FIN_mrr',
    label:       'MRR (USD)',
    sourceType:  'stripe',
    dataType:    'number',
    description: 'Monthly recurring revenue from this customer in USD cents. Annual plans divided by 12, rounded.',
  },
  {
    fieldKey:    'FIN_trial_end',
    label:       'Trial end date',
    sourceType:  'stripe',
    dataType:    'date',
    description: 'Date the trial period ends (null if not on trial)',
  },
  {
    fieldKey:    'FIN_subscription_start',
    label:       'Subscription start date',
    sourceType:  'stripe',
    dataType:    'date',
    description: 'Date the current subscription started',
  },
  {
    fieldKey:    'FIN_last_invoice_amount',
    label:       'Last invoice amount (USD)',
    sourceType:  'stripe',
    dataType:    'number',
    description: 'Amount of the most recent invoice in USD cents',
  },
  {
    fieldKey:    'FIN_last_invoice_date',
    label:       'Last invoice date',
    sourceType:  'stripe',
    dataType:    'date',
    description: 'Date of the most recent invoice',
  },
  {
    fieldKey:    'FIN_last_invoice_status',
    label:       'Last invoice status',
    sourceType:  'stripe',
    dataType:    'enum',
    enumValues:  ['paid', 'open', 'void', 'uncollectible'],
    description: 'Status of the most recent invoice',
  },
  {
    fieldKey:    'FIN_lifetime_value',
    label:       'Lifetime value (USD)',
    sourceType:  'stripe',
    dataType:    'number',
    description: 'Total amount paid across all invoices in USD cents',
  },
  {
    fieldKey:    'FIN_stripe_customer_id',
    label:       'Stripe customer ID',
    sourceType:  'stripe',
    dataType:    'string',
    description: 'Stripe cus_xxx identifier',
  },
];

// CDM fields — org-level aggregates (B2B only)
export const STRIPE_CDM_FIELDS: FieldDefinition[] = [
  {
    fieldKey:    'FIN_total_mrr',
    label:       'Total MRR (USD)',
    sourceType:  'stripe',
    dataType:    'number',
    description: 'Sum of MRR across all active subscribers in USD cents',
  },
  {
    fieldKey:    'FIN_active_subscribers',
    label:       'Active subscribers',
    sourceType:  'stripe',
    dataType:    'number',
    description: 'Count of customers with active or trialing subscriptions',
  },
  {
    fieldKey:    'FIN_churned_this_month',
    label:       'Churned this month',
    sourceType:  'stripe',
    dataType:    'number',
    description: 'Count of cancellations in the current calendar month',
  },
  {
    fieldKey:    'FIN_avg_revenue_per_user',
    label:       'ARPU (USD)',
    sourceType:  'stripe',
    dataType:    'number',
    description: 'Average MRR per active subscriber in USD cents',
  },
];
