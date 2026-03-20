export const B2B_VERTICALS = [
  { value: 'saas',       label: 'SaaS' },
  { value: 'fintech',    label: 'Fintech' },
  { value: 'martech',    label: 'Martech' },
  { value: 'devtools',   label: 'Developer Tools' },
  { value: 'healthtech', label: 'Healthtech' },
  { value: 'hrtech',     label: 'HR Tech' },
  { value: 'logistics',  label: 'Logistics' },
  { value: 'other_b2b',  label: 'Other B2B' },
] as const;

export const B2C_VERTICALS = [
  { value: 'ecommerce',    label: 'E-commerce' },
  { value: 'consumer_app', label: 'Consumer App' },
  { value: 'media',        label: 'Media & Content' },
  { value: 'gaming',       label: 'Gaming' },
  { value: 'fintech_b2c',  label: 'Fintech' },
  { value: 'other_b2c',    label: 'Other B2C' },
] as const;

export const STAGES = [
  { value: 'pre_seed', label: 'Pre-Seed' },
  { value: 'seed',     label: 'Seed' },
  { value: 'series_a', label: 'Series A' },
  { value: 'series_b', label: 'Series B' },
  { value: 'series_c', label: 'Series C+' },
  { value: 'growth',   label: 'Growth / Public' },
] as const;
