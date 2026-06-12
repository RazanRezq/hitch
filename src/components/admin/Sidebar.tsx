'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  Radio,
  ClipboardList,
  Users,
  Car,
  Menu,
  X,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/ui';
import { LOCALES } from '@/lib/types';
import { useChangeLocale } from '@/lib/use-change-locale';
import { authClient } from '@/lib/auth/client';
import { Avatar } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

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
  { key: 'drivers', href: 'drivers', icon: Users },
  { key: 'fleet', href: 'fleet', icon: Car },
];

interface SidebarProps {
  locale: string;
  user: { name: string | null; email: string; role: string };
}

export function Sidebar({ locale, user }: SidebarProps) {
  const t = useTranslations('nav');
  const tAdmin = useTranslations('admin');
  const pathname = usePathname();
  const router = useRouter();
  const { locale: current, change } = useChangeLocale();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await authClient.signOut();
    router.replace(`/${locale}/login`);
  }

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

        {/* Language switcher */}
        <div className="mt-4 flex items-center gap-1">
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

        {/* User menu */}
        <div className="mt-3 border-t pt-3">
          <DropdownMenu
            align="start"
            triggerClassName="w-full"
            triggerLabel={user.name ?? user.email}
            trigger={
              <span className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted">
                <Avatar name={user.name} className="size-8" />
                <span className="flex min-w-0 flex-col items-start">
                  <span className="truncate text-sm font-medium">{user.name ?? user.email}</span>
                  <span className="truncate text-xs text-muted-foreground">{user.role}</span>
                </span>
              </span>
            }
          >
            <div className="px-2 py-1.5">
              <p className="text-xs text-muted-foreground">{tAdmin('signedInAs')}</p>
              <p className="truncate text-sm text-ltr">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={signOut}>
              <LogOut className="size-4" />
              {tAdmin('logout')}
            </DropdownMenuItem>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}
