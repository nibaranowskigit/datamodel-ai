'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Settings, AlertTriangle, Fingerprint, Table2, ListTree } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, badgeCount: false as const },
  { label: 'Field registry', href: '/fields', icon: ListTree, badgeCount: false as const },
  { label: 'Data model', href: '/data-model/fields', icon: Table2, badgeCount: false as const },
  { label: 'Conflicts', href: '/conflicts', icon: AlertTriangle, badgeCount: true as const },
  { label: 'Identity', href: '/identity', icon: Fingerprint, badgeCount: false as const },
  { label: 'Settings', href: '/settings', icon: Settings, badgeCount: false as const },
] as const;

export function DashboardNav({ openConflictCount = 0 }: { openConflictCount?: number }) {
  const pathname = usePathname();

  return (
    <nav className="p-2 space-y-0.5 mt-2">
      {NAV_ITEMS.map(({ label, href, icon: Icon, badgeCount }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        const showBadge = badgeCount && openConflictCount > 0;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors duration-150',
              active
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="flex-1">{label}</span>
            {showBadge && (
              <Badge variant="destructive" className="text-xs tabular-nums px-1.5 min-w-6 justify-center">
                {openConflictCount > 99 ? '99+' : openConflictCount}
              </Badge>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
