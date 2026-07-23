'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { UserButton } from '@clerk/nextjs';
import {
  LayoutDashboard,
  Radio,
  ClipboardList,
  Users,
  Car,
  Receipt,
  Wallet,
  Menu,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/ui';
import { LOCALES } from '@/lib/types';
import { useChangeLocale } from '@/lib/use-change-locale';

interface NavItem {
  key: string;
  href: string;
  icon: LucideIcon;
}

// Only the dispatcher ops-core sections ship today. pricing/payments/reports
// return when those phases land — omitted here so nav never links to a 404.
const NAV_ITEMS: readonly NavItem[] = [
  { key: 'overview', href: 'overview', icon: LayoutDashboard },
  { key: 'dispatch', href: 'dispatch', icon: Radio },
  { key: 'bookings', href: 'bookings', icon: ClipboardList },
  { key: 'receipts', href: 'receipts', icon: Receipt },
  { key: 'earnings', href: 'earnings', icon: Wallet },
  { key: 'drivers', href: 'drivers', icon: Users },
  { key: 'fleet', href: 'fleet', icon: Car },
];

interface SidebarProps {
  locale: string;
}

export function Sidebar({ locale }: SidebarProps) {
  const t = useTranslations('nav');
  const tAdmin = useTranslations('admin');
  const pathname = usePathname();
  const { locale: current, change } = useChangeLocale();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b bg-card px-4 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={tAdmin('menu')}
          className="rounded-md p-1 hover:bg-muted"
        >
          <Menu className="size-5" />
        </button>
        <span className="text-lg font-semibold">Hitch</span>
      </div>

      {/* Backdrop (mobile, when open) */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'w-60 shrink-0 flex-col border-e bg-card ps-6 pe-4 py-6 md:flex',
          'max-md:fixed max-md:inset-y-0 max-md:start-0 max-md:z-50',
          open ? 'max-md:flex' : 'max-md:hidden',
        )}
      >
        <div className="mb-8 flex items-center justify-between">
          <span className="text-lg font-semibold">Hitch</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={tAdmin('menu')}
            className="rounded-md p-1 hover:bg-muted md:hidden"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const href = `/${locale}/admin/${item.href}`;
            const active = pathname.startsWith(href);
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="size-4 shrink-0" />
                {t(item.key)}
              </Link>
            );
          })}
        </nav>

        {/* Language switcher + Clerk account (account + sign-out live in UserButton) */}
        <div className="mt-4 border-t pt-4">
          <div className="mb-3 flex items-center gap-1">
            {LOCALES.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => change(l)}
                className={cn(
                  'rounded-md px-2 py-1 text-xs font-medium uppercase transition-colors',
                  current === l
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {l}
              </button>
            ))}
          </div>
          <UserButton showName />
        </div>
      </aside>
    </>
  );
}
