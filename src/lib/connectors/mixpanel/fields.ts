export type FieldDefinition = {
  fieldKey: string;
  label: string;
  sourceType: string;
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'enum';
  enumValues?: string[];
  description: string;
};

// UDM fields — per-user product engagement
export const MIXPANEL_UDM_FIELDS: FieldDefinition[] = [
  {
    fieldKey:    'PROD_last_seen',
    label:       'Last seen',
    sourceType:  'mixpanel',
    dataType:    'date',
    description: 'Date and time the user last triggered any event',
  },
  {
    fieldKey:    'PROD_first_seen',
    label:       'First seen',
    sourceType:  'mixpanel',
    dataType:    'date',
    description: 'Date the user first triggered any event (signup / first use)',
  },
  {
    fieldKey:    'PROD_session_count_30d',
    label:       'Sessions (30d)',
    sourceType:  'mixpanel',
    dataType:    'number',
    description: 'Number of sessions in the last 30 days',
  },
  {
    fieldKey:    'PROD_activated',
    label:       'Activated',
    sourceType:  'mixpanel',
    dataType:    'boolean',
    description: 'Has user triggered the configured activation event?',
  },
  {
    fieldKey:    'PROD_activation_date',
    label:       'Activation date',
    sourceType:  'mixpanel',
    dataType:    'date',
    description: 'Date the user first triggered the activation event',
  },
  {
    fieldKey:    'PROD_days_since_last_seen',
    label:       'Days since last seen',
    sourceType:  'mixpanel',
    dataType:    'number',
    description: 'Number of days since the user last triggered any event',
  },
  {
    fieldKey:    'PROD_feature_breadth',
    label:       'Feature breadth (30d)',
    sourceType:  'mixpanel',
    dataType:    'number',
    description: 'Count of distinct event types triggered in the last 30 days',
  },
  {
    fieldKey:    'PROD_country',
    label:       'Country',
    sourceType:  'mixpanel',
    dataType:    'string',
    description: 'User country from Mixpanel geo data',
  },
  {
    fieldKey:    'PROD_mixpanel_distinct_id',
    label:       'Mixpanel distinct ID',
    sourceType:  'mixpanel',
    dataType:    'string',
    description: 'Mixpanel distinct_id (join key)',
  },
];

// CDM fields — org-level product aggregates
export const MIXPANEL_CDM_FIELDS: FieldDefinition[] = [
  {
    fieldKey:    'PROD_mau',
    label:       'MAU',
    sourceType:  'mixpanel',
    dataType:    'number',
    description: 'Monthly active users — users seen in last 30 days',
  },
  {
    fieldKey:    'PROD_wau',
    label:       'WAU',
    sourceType:  'mixpanel',
    dataType:    'number',
    description: 'Weekly active users — users seen in last 7 days',
  },
  {
    fieldKey:    'PROD_dau',
    label:       'DAU',
    sourceType:  'mixpanel',
    dataType:    'number',
    description: 'Daily active users — users seen in last 24 hours',
  },
  {
    fieldKey:    'PROD_activation_rate',
    label:       'Activation rate (%)',
    sourceType:  'mixpanel',
    dataType:    'number',
    description: 'Percentage of total users who have triggered the activation event',
  },
  {
    fieldKey:    'PROD_avg_sessions_30d',
    label:       'Avg sessions (30d)',
    sourceType:  'mixpanel',
    dataType:    'number',
    description: 'Average sessions per active user over 30 days',
  },
  {
    fieldKey:    'PROD_pct_dormant',
    label:       '% dormant (30d)',
    sourceType:  'mixpanel',
    dataType:    'number',
    description: 'Percentage of users with zero activity in last 30 days',
  },
];
