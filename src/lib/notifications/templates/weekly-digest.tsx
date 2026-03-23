import { Text } from '@react-email/components';
import * as React from 'react';
import { BaseEmail } from './base';

type Props = {
  title: string;
  body: string;
  link?: string;
  data?: Record<string, unknown>;
};

export function WeeklyDigestEmail({ title, body, link, data: _data }: Props) {
  return (
    <BaseEmail
      preview={title}
      title={title}
      ctaLabel="View dashboard"
      ctaHref={link ?? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`}
    >
      <Text style={{ color: '#A1A1AA', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
        {body}
      </Text>
    </BaseEmail>
  );
}
