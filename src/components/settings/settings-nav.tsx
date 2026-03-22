'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

type NavItem = {
  label: string;
  href: string;
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Profile',       href: '/settings/profile' },
  { label: 'Team',          href: '/settings/team' },
  { label: 'Sources',       href: '/settings/sources' },
  { label: 'Notifications', href: '/settings/notifications' },
  { label: 'API Keys',      href: '/settings/api-keys' },
  { label: 'Billing',       href: '/settings/billing' },
  { label: 'Danger zone',   href: '/settings/danger', adminOnly: true },
];

export function SettingsNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible">
      {items.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + '/');

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'px-3 py-2 rounded-md text-sm transition-colors duration-150 whitespace-nowrap',
              'hover:bg-muted hover:text-foreground',
              isActive
                ? 'bg-muted text-foreground font-medium'
                : 'text-muted-foreground',
              item.adminOnly &&
                'text-destructive hover:text-destructive hover:bg-destructive/10',
              item.adminOnly &&
                isActive &&
                'bg-destructive/10 text-destructive font-medium',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
