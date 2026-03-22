import { Card } from '@/components/ui/card';
import { B2B_VERTICALS, B2C_VERTICALS, STAGES } from '@/lib/onboarding/constants';

type OrgProfile = {
  name: string;
  businessType: 'b2b' | 'b2c' | null;
  vertical: string | null;
  stage: string | null;
};

function resolveLabel(
  value: string | null,
  options: readonly { value: string; label: string }[]
) {
  return options.find((o) => o.value === value)?.label ?? value ?? '—';
}

export function OrgProfileReadOnly({ org }: { org: OrgProfile }) {
  const verticals = org.businessType === 'b2b' ? B2B_VERTICALS : B2C_VERTICALS;

  const fields = [
    { label: 'Organisation name', value: org.name },
    { label: 'Business model',    value: org.businessType?.toUpperCase() ?? '—' },
    { label: 'Vertical',          value: resolveLabel(org.vertical, verticals) },
    { label: 'Stage',             value: resolveLabel(org.stage, STAGES) },
  ];

  return (
    <Card className="p-6 divide-y divide-border">
      {fields.map((field) => (
        <div key={field.label} className="flex justify-between py-3 first:pt-0 last:pb-0">
          <span className="text-sm text-muted-foreground">{field.label}</span>
          <span className="text-sm font-medium">{field.value}</span>
        </div>
      ))}
      <p className="text-xs text-muted-foreground pt-3">
        Contact an Admin to make changes.
      </p>
    </Card>
  );
}
