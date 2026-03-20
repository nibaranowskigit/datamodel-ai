import { CheckCircle2 } from 'lucide-react';

const VALUE_PROPS = [
  {
    headline: 'One trusted data model',
    body: 'Define canonical fields once. Every AI agent reads from the same source of truth.',
  },
  {
    headline: 'Works across your stack',
    body: 'Connect HubSpot, Salesforce, Stripe, and more. Syncs automatically in the background.',
  },
  {
    headline: 'Built for AI agents',
    body: 'Schema-first design means your agents get structured, validated data — not raw CRM chaos.',
  },
  {
    headline: 'Team approval workflow',
    body: 'Propose new fields. Review and approve. No field reaches production without sign-off.',
  },
] as const;

export function ValueProps() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Datamodel.ai</h1>
        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
          The data model your AI agents trust.
        </p>
      </div>

      <ul className="space-y-5">
        {VALUE_PROPS.map((vp) => (
          <li key={vp.headline} className="flex gap-3">
            <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">{vp.headline}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{vp.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
