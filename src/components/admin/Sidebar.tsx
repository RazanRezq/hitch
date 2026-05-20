import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface SidebarProps {
  locale: string;
}

const NAV_ITEMS = [
  { key: 'overview', href: 'overview' },
  { key: 'bookings', href: 'bookings' },
  { key: 'drivers', href: 'drivers' },
  { key: 'fleet', href: 'fleet' },
  { key: 'pricing', href: 'pricing' },
  { key: 'payments', href: 'payments' },
  { key: 'reports', href: 'reports' },
] as const;

export function Sidebar({ locale }: SidebarProps) {
  const t = useTranslations('nav');
  return (
    <aside className="w-60 border-e bg-card ps-6 pe-4 py-6">
      <div className="text-lg font-semibold mb-8">Hitch</div>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.key}
            href={`/${locale}/admin/${item.href}`}
            className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {t(item.key)}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
