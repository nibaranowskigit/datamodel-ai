import { Section, Text, Link } from '@react-email/components';
import * as React from 'react';
import { BaseEmail } from './base';
import type { DigestData } from '@/lib/notifications/digest/build-digest';

type Props = {
  title: string;
  body: string;
  link?: string;
  data?: Record<string, unknown>;
};

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

function deltaLabel(delta: number | null): string {
  if (delta === null) return '';
  if (delta > 0) return ` ↑ +${delta}`;
  if (delta < 0) return ` ↓ ${delta}`;
  return ' → unchanged';
}

export function WeeklyDigestEmail({ title, body, link, data }: Props) {
  const digest = data?.digest as DigestData | undefined;

  if (!digest) {
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

  const weekLabel = `${formatDate(new Date(digest.weekStart))} – ${formatDate(new Date(digest.weekEnd))}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  return (
    <BaseEmail
      preview={`Your Datamodel.ai digest for ${weekLabel}`}
      title="Your weekly digest"
      ctaLabel="Open dashboard"
      ctaHref={link ?? `${appUrl}/dashboard`}
    >
      {/* Week range */}
      <Text style={{ color: '#818190', fontSize: '12px', margin: '0 0 24px' }}>
        {weekLabel}
      </Text>

      {/* Syncs section */}
      <Text style={{
        color: '#FAFAFA', fontSize: '13px', fontWeight: '600',
        textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px',
      }}>
        Syncs
      </Text>
      <Section style={{
        background: '#252530', borderRadius: '8px', padding: '16px',
        marginBottom: '16px',
      }}>
        <Text style={{ color: '#FAFAFA', fontSize: '13px', margin: '0 0 6px' }}>
          {digest.syncs.total} runs last week
          {' — '}
          {digest.syncs.succeeded} succeeded
          {digest.syncs.failed > 0 ? `, ${digest.syncs.failed} failed` : ''}
        </Text>
        {digest.syncs.sources.length > 0 && (
          <Text style={{ color: '#818190', fontSize: '12px', margin: 0 }}>
            Sources: {digest.syncs.sources.join(', ')}
          </Text>
        )}
      </Section>

      {/* Fields section */}
      <Text style={{
        color: '#FAFAFA', fontSize: '13px', fontWeight: '600',
        textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px',
      }}>
        Fields
      </Text>
      <Section style={{
        background: '#252530', borderRadius: '8px', padding: '16px',
        marginBottom: '16px',
      }}>
        <Text style={{ color: '#FAFAFA', fontSize: '13px', margin: '0 0 4px' }}>
          {digest.fields.approvedThisWeek} approved this week
        </Text>
        <Text style={{ color: '#FAFAFA', fontSize: '13px', margin: '0 0 4px' }}>
          {digest.fields.proposedThisWeek} newly proposed
        </Text>
        {digest.fields.pendingApproval > 0 && (
          <Text style={{ color: '#EF9F27', fontSize: '13px', margin: 0 }}>
            {digest.fields.pendingApproval} waiting for approval →{' '}
            <Link href={`${appUrl}/data-model/fields`} style={{ color: '#0EA5E9' }}>
              Review now
            </Link>
          </Text>
        )}
      </Section>

      {/* Health score section — omitted when S3.4 hasn't run yet */}
      {digest.health.currentScore !== null && (
        <>
          <Text style={{
            color: '#FAFAFA', fontSize: '13px', fontWeight: '600',
            textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px',
          }}>
            Data health
          </Text>
          <Section style={{
            background: '#252530', borderRadius: '8px', padding: '16px',
            marginBottom: '16px',
          }}>
            <Text style={{ color: '#FAFAFA', fontSize: '24px', fontWeight: '600', margin: '0 0 4px' }}>
              {digest.health.currentScore}
              <span style={{
                fontSize: '13px',
                fontWeight: '400',
                color: digest.health.delta !== null && digest.health.delta > 0
                  ? '#34d399'
                  : '#f87171',
              }}>
                {deltaLabel(digest.health.delta)}
              </span>
            </Text>
            <Text style={{ color: '#818190', fontSize: '12px', margin: 0 }}>
              out of 100
            </Text>
          </Section>
        </>
      )}
    </BaseEmail>
  );
}
