export type MatchResult = {
  rule:       string;
  confidence: number;
  evidence:   Record<string, unknown>;
};

export type ProfileData = {
  id:          string;
  email:       string | null;
  sourceTypes: string[];
  fields:      Record<string, unknown>;
};

const GENERIC_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'icloud.com',
  'me.com',
  'protonmail.com',
  'live.com',
]);

export function norm(s: unknown): string {
  return String(s ?? '').trim().toLowerCase();
}

export function emailDomain(email: string): string {
  return email.split('@')[1]?.toLowerCase() ?? '';
}

/** Display / match name from UDM field map (HubSpot-style + GEN_* keys used by connectors). */
export function fullNameFromFields(f: Record<string, unknown>): string {
  const full = norm(f.HS_full_name);
  if (full) return full;
  const first = norm(f.GEN_first_name_v1);
  const last = norm(f.GEN_last_name_v1);
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (last) return last;
  const dollar = norm(f.$name);
  return dollar;
}

export function matchExactEmail(a: ProfileData, b: ProfileData): MatchResult | null {
  const ea = norm(a.email);
  const eb = norm(b.email);
  if (!ea || !eb) return null;
  if (ea !== eb) return null;
  return {
    rule:       'exact_email',
    confidence: 1.0,
    evidence:   { email: ea },
  };
}

export function matchDomainAndName(a: ProfileData, b: ProfileData): MatchResult | null {
  const ea = norm(a.email);
  const eb = norm(b.email);
  if (!ea || !eb) return null;

  const domainA = emailDomain(ea);
  const domainB = emailDomain(eb);
  if (!domainA || domainA !== domainB) return null;
  if (GENERIC_DOMAINS.has(domainA)) return null;

  const nameA = fullNameFromFields(a.fields);
  const nameB = fullNameFromFields(b.fields);
  if (!nameA || !nameB) return null;
  if (nameA !== nameB) return null;

  return {
    rule:       'domain_name',
    confidence: 0.85,
    evidence:   { domain: domainA, name: nameA },
  };
}

function stripeCustomerId(fields: Record<string, unknown>): string {
  return norm(fields.FIN_stripe_customer_id);
}

function intercomContactId(fields: Record<string, unknown>): string {
  return norm(fields.SUP_intercom_contact_id);
}

export function matchExternalId(a: ProfileData, b: ProfileData): MatchResult | null {
  const typesA = new Set(a.sourceTypes);
  const typesB = new Set(b.sourceTypes);
  const hasHub = typesA.has('hubspot') || typesB.has('hubspot');
  const hasStripe = typesA.has('stripe') || typesB.has('stripe');
  if (hasHub && hasStripe) {
    const sa = stripeCustomerId(a.fields);
    const sb = stripeCustomerId(b.fields);
    if (sa && sa === sb) {
      return {
        rule:       'external_id',
        confidence: 1.0,
        evidence:   { field: 'FIN_stripe_customer_id', value: sa },
      };
    }
  }

  const hasIntercom = typesA.has('intercom') || typesB.has('intercom');
  if (hasHub && hasIntercom) {
    const ia = intercomContactId(a.fields);
    const ib = intercomContactId(b.fields);
    if (ia && ia === ib) {
      return {
        rule:       'external_id',
        confidence: 1.0,
        evidence:   { field: 'SUP_intercom_contact_id', value: ia },
      };
    }
  }

  return null;
}

export function matchDomainOnly(a: ProfileData, b: ProfileData): MatchResult | null {
  const ea = norm(a.email);
  const eb = norm(b.email);
  if (!ea || !eb) return null;

  const domainA = emailDomain(ea);
  const domainB = emailDomain(eb);
  if (!domainA || domainA !== domainB) return null;
  if (GENERIC_DOMAINS.has(domainA)) return null;

  return {
    rule:       'domain_only',
    confidence: 0.5,
    evidence:   { domain: domainA },
  };
}

export function findMatch(a: ProfileData, b: ProfileData): MatchResult | null {
  return (
    matchExternalId(a, b)    ??
    matchExactEmail(a, b)    ??
    matchDomainAndName(a, b) ??
    matchDomainOnly(a, b)    ??
    null
  );
}
