import * as React from 'react';
import type { NotificationType } from '@/lib/notifications/types';
import { SyncFailureEmail }   from './sync-failure';
import { FieldApprovalEmail } from './field-approval';
import { BillingEmail }       from './billing';
import { WeeklyDigestEmail }  from './weekly-digest';

type TemplateProps = {
  title: string;
  body: string;
  link?: string;
  data?: Record<string, unknown>;
};

export function getEmailTemplate(
  type: NotificationType,
  props: TemplateProps
): React.ReactElement {
  switch (type) {
    case 'sync_failure':
      return React.createElement(SyncFailureEmail, props);
    case 'field_approval':
      return React.createElement(FieldApprovalEmail, props);
    case 'billing':
      return React.createElement(BillingEmail, props);
    case 'weekly_digest':
      return React.createElement(WeeklyDigestEmail, props);
  }
}
