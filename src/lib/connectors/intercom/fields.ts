export type FieldDefinition = {
  fieldKey: string;
  label: string;
  sourceType: string;
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'enum';
  enumValues?: string[];
  description: string;
};

// UDM fields — per-contact support data
export const INTERCOM_UDM_FIELDS: FieldDefinition[] = [
  {
    fieldKey:    'SUP_open_tickets',
    label:       'Open tickets',
    sourceType:  'intercom',
    dataType:    'number',
    description: 'Count of currently open support conversations',
  },
  {
    fieldKey:    'SUP_closed_tickets',
    label:       'Closed tickets (90d)',
    sourceType:  'intercom',
    dataType:    'number',
    description: 'Count of closed conversations in the last 90 days',
  },
  {
    fieldKey:    'SUP_csat_score',
    label:       'CSAT score (avg)',
    sourceType:  'intercom',
    dataType:    'number',
    description: 'Average CSAT rating across all rated conversations (1–5)',
  },
  {
    fieldKey:    'SUP_csat_responses',
    label:       'CSAT responses',
    sourceType:  'intercom',
    dataType:    'number',
    description: 'Total number of CSAT responses submitted',
  },
  {
    fieldKey:    'SUP_last_contact_date',
    label:       'Last contact date',
    sourceType:  'intercom',
    dataType:    'date',
    description: 'Date of most recent conversation with this contact',
  },
  {
    fieldKey:    'SUP_first_contact_date',
    label:       'First contact date',
    sourceType:  'intercom',
    dataType:    'date',
    description: 'Date of first ever conversation',
  },
  {
    fieldKey:    'SUP_total_conversations',
    label:       'Total conversations',
    sourceType:  'intercom',
    dataType:    'number',
    description: 'Lifetime count of all conversations',
  },
  {
    fieldKey:    'SUP_last_csat_rating',
    label:       'Last CSAT rating',
    sourceType:  'intercom',
    dataType:    'enum',
    enumValues:  ['amazing', 'great', 'good', 'bad', 'terrible'],
    description: 'Most recent CSAT rating submitted',
  },
  {
    fieldKey:    'SUP_intercom_contact_id',
    label:       'Intercom contact ID',
    sourceType:  'intercom',
    dataType:    'string',
    description: 'Intercom contact identifier (join key)',
  },
];

// CDM fields — org-level support aggregates
export const INTERCOM_CDM_FIELDS: FieldDefinition[] = [
  {
    fieldKey:    'SUP_avg_csat',
    label:       'Avg CSAT score',
    sourceType:  'intercom',
    dataType:    'number',
    description: 'Average CSAT score across all contacts with responses',
  },
  {
    fieldKey:    'SUP_total_open_tickets',
    label:       'Total open tickets',
    sourceType:  'intercom',
    dataType:    'number',
    description: 'Sum of open tickets across all contacts',
  },
  {
    fieldKey:    'SUP_contacts_with_open_tickets',
    label:       'Contacts with open tickets',
    sourceType:  'intercom',
    dataType:    'number',
    description: 'Count of contacts who have at least one open ticket',
  },
  {
    fieldKey:    'SUP_pct_rated_positively',
    label:       '% rated positively',
    sourceType:  'intercom',
    dataType:    'number',
    description: 'Percentage of CSAT responses rated "good", "great", or "amazing"',
  },
];
