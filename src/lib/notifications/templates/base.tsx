import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
  Preview,
} from '@react-email/components';
import * as React from 'react';

type BaseEmailProps = {
  preview: string;
  title: string;
  children: React.ReactNode;
  ctaLabel?: string;
  ctaHref?: string;
};

export function BaseEmail({
  preview,
  title,
  children,
  ctaLabel,
  ctaHref,
}: BaseEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: '#09090B', fontFamily: 'system-ui, sans-serif' }}>
        <Container
          style={{
            maxWidth: '560px',
            margin: '40px auto',
            backgroundColor: '#0F0F12',
            border: '1px solid #252530',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <Section style={{ padding: '24px 32px', borderBottom: '1px solid #252530' }}>
            <Text style={{ color: '#FAFAFA', fontWeight: '600', fontSize: '15px', margin: 0 }}>
              Datamodel.ai
            </Text>
          </Section>

          {/* Content */}
          <Section style={{ padding: '32px' }}>
            <Text style={{ color: '#FAFAFA', fontSize: '20px', fontWeight: '600', margin: '0 0 12px' }}>
              {title}
            </Text>
            {children}

            {ctaLabel && ctaHref && (
              <Section style={{ marginTop: '24px' }}>
                <Link
                  href={ctaHref}
                  style={{
                    backgroundColor: '#0EA5E9',
                    color: '#fff',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontWeight: '500',
                    fontSize: '14px',
                    textDecoration: 'none',
                    display: 'inline-block',
                  }}
                >
                  {ctaLabel}
                </Link>
              </Section>
            )}
          </Section>

          {/* Footer */}
          <Hr style={{ borderColor: '#252530', margin: 0 }} />
          <Section style={{ padding: '16px 32px' }}>
            <Text style={{ color: '#818190', fontSize: '12px', margin: 0 }}>
              You&apos;re receiving this because you have notifications enabled in your workspace
              settings.{' '}
              <Link
                href={`${process.env.NEXT_PUBLIC_APP_URL}/settings/notifications`}
                style={{ color: '#0EA5E9' }}
              >
                Manage preferences
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
