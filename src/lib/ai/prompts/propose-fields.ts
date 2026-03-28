import type { FieldSample } from '../field-sampler';

export type ProposalContext = {
  businessType:     'b2b' | 'b2c';
  vertical:         string;
  namespace:        string;
  connectedSources: string[];
  existingFields:   string[];
  samples:          FieldSample[];
};

export function buildFieldProposalPrompt(ctx: ProposalContext): string {
  const { businessType, vertical, namespace, connectedSources, existingFields, samples } = ctx;

  const namespaceDescription: Record<string, string> = {
    HS_:   'CRM and contact relationship fields from HubSpot',
    FIN_:  'Financial and billing fields from Stripe',
    SUP_:  'Support and customer service fields from Intercom',
    PROD_: 'Product usage and engagement fields from Mixpanel',
  };

  const relevantSamples = samples
    .filter((s) => s.fieldKey.startsWith(namespace))
    .slice(0, 30);

  return `You are a data model architect for a ${businessType.toUpperCase()} ${vertical} company.

The company has connected the following data sources: ${connectedSources.join(', ')}.

You are reviewing raw field data from the ${namespace} namespace — ${namespaceDescription[namespace] ?? namespace}.

EXISTING APPROVED OR PROPOSED FIELDS (do not re-propose these):
${existingFields.filter((k) => k.startsWith(namespace)).join('\n') || 'None yet'}

OBSERVED FIELD DATA (from up to 200 primary UDM records):
${relevantSamples.length === 0
    ? '(No samples in this namespace — return an empty proposals array.)'
    : relevantSamples
      .map(
        (s) =>
          `- ${s.fieldKey}: ${s.sampleValues.slice(0, 3).join(', ')} (${s.recordCount} values)`,
      )
      .join('\n')}

Your task: Propose up to 5 new fields that:
1. Are genuinely useful for AI agents answering business questions
2. Are NOT already in the existing fields list above
3. Use field keys in ${namespace}snake_case format (must start with ${namespace})
4. Have a clear business meaning and data type
5. Have strong evidence from the observed data (appear in ≥ 5 records in sourceEvidence.recordCount)
6. Set sourceEvidence.sampleValues from real observed values; sourceEvidence.sourceType should match the dominant source for that signal

For each proposal, set confidence between 0 and 1 (use ≥ 0.7 only when evidence is strong).

Return JSON only. If no new fields are warranted, return an empty proposals array.`;
}

export function buildCdmFieldProposalPrompt(params: {
  vertical:         string;
  connectedSources: string[];
  existingCdmKeys:  string[];
  samples:          FieldSample[];
}): string {
  const { vertical, connectedSources, existingCdmKeys, samples } = params;

  const lines =
    samples.length === 0
      ? '(No CDM field samples — return an empty proposals array.)'
      : samples
        .slice(0, 30)
        .map(
          (s) =>
            `- ${s.fieldKey}: ${s.sampleValues.slice(0, 3).join(', ')} (${s.recordCount} values)`,
        )
        .join('\n');

  return `You are reviewing aggregated company-level (CDM) data for a B2B ${vertical} company.

Connected sources: ${connectedSources.join(', ')}

Existing CDM-related or non-namespaced keys already in the registry (do not re-propose):
${existingCdmKeys.length ? existingCdmKeys.join(', ') : 'None'}

OBSERVED CDM FIELD DATA (from up to 200 company records):
${lines}

Propose up to 3 company-level aggregate fields useful to AI agents.
Use snake_case field keys with NO HubSpot/Stripe-style prefix (e.g. total_revenue, active_users_30d, avg_deal_size).
Each proposal must include sourceEvidence with recordCount ≥ 5 when possible, sampleValues from observed data, and confidence ≥ 0.7 only when evidence is strong.

Return JSON only. If nothing new is warranted, return an empty proposals array.`;
}
