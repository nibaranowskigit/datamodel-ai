export const TIER_1_SOURCES = [
  {
    sourceType: 'hubspot',
    label: 'HubSpot',
    description: 'Companies, contacts, deals',
    fields: [
      { key: 'apiKey', label: 'Private App Token', type: 'password' as const },
    ],
  },
  {
    sourceType: 'stripe',
    label: 'Stripe',
    description: 'Subscriptions, MRR, invoices',
    fields: [
      { key: 'secretKey', label: 'Secret Key', type: 'password' as const },
    ],
  },
  {
    sourceType: 'intercom',
    label: 'Intercom',
    description: 'Tickets, CSAT, conversations',
    fields: [
      { key: 'accessToken', label: 'Access Token', type: 'password' as const },
    ],
  },
  {
    sourceType: 'mixpanel',
    label: 'Mixpanel',
    description: 'DAU, feature events, activation',
    fields: [
      { key: 'projectToken',           label: 'Project Token',                        type: 'text' as const },
      { key: 'serviceAccountUsername', label: 'Service Account Username',             type: 'text' as const },
      { key: 'serviceAccountSecret',   label: 'Service Account Secret',               type: 'password' as const },
      { key: 'activationEvent',        label: 'Activation event name (optional)',     type: 'text' as const },
    ],
  },
] as const;

export type TierOneSource = typeof TIER_1_SOURCES[number];
