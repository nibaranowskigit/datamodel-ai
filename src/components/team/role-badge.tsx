import { Badge } from '@/components/ui/badge';
import type { OrgRole } from '@/lib/roles';

const ROLE_CONFIG: Record<
  OrgRole,
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  'org:admin':  { label: 'Admin',  variant: 'default' },
  'org:member': { label: 'Member', variant: 'secondary' },
  'org:viewer': { label: 'Viewer', variant: 'outline' },
};

export function RoleBadge({ role }: { role: string }) {
  const config = ROLE_CONFIG[role as OrgRole] ?? {
    label: role,
    variant: 'outline' as const,
  };

  return (
    <Badge variant={config.variant} className="text-xs">
      {config.label}
    </Badge>
  );
}
