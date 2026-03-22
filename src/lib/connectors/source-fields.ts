import { TIER_1_SOURCES } from '@/lib/onboarding/sources';

export function getSourceFields(sourceType: string) {
  const source = TIER_1_SOURCES.find((s) => s.sourceType === sourceType);
  // Return a mutable copy so callers don't get the readonly tuple type
  return source ? [...source.fields] : [];
}

export const SOURCE_META: Record<string, { label: string; color: string }> = {
  hubspot:  { label: 'HubSpot',  color: 'orange' },
  stripe:   { label: 'Stripe',   color: 'purple' },
  intercom: { label: 'Intercom', color: 'blue' },
  mixpanel: { label: 'Mixpanel', color: 'violet' },
};
