import type { ReactNode } from 'react';
import { Sidebar } from '@/components/admin/Sidebar';

/**
 * Admin section layout — nested inside the root [locale]/layout. Does NOT render
 * <html>/<body>/<NextIntlClientProvider> (the root layout already handles that).
 * Just the dispatcher chrome: sidebar + main pane.
 */
export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <div className="flex min-h-screen">
      <Sidebar locale={locale} />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
