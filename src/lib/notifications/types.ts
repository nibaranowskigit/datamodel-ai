export type NotificationType =
  | 'sync_failure'
  | 'field_approval'
  | 'billing'
  | 'weekly_digest';

export const NOTIFICATION_TYPES: {
  type: NotificationType;
  label: string;
  description: string;
  defaultEnabled: boolean;
}[] = [
  {
    type: 'sync_failure',
    label: 'Sync failures',
    description: 'Email when a data source fails to sync. Sent immediately on failure.',
    defaultEnabled: true,
  },
  {
    type: 'field_approval',
    label: 'Field approvals needed',
    description: 'Email when AI proposes new fields for your review. Sent once per batch.',
    defaultEnabled: true,
  },
  {
    type: 'billing',
    label: 'Billing alerts',
    description: 'Payment confirmations, failed charges, and subscription changes.',
    defaultEnabled: true,
  },
  {
    type: 'weekly_digest',
    label: 'Weekly digest',
    description: 'Sunday summary of sync health, new fields, and health score changes.',
    defaultEnabled: false,
  },
];
