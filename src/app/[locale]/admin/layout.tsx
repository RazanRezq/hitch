import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { USER_ROLES } from '@/lib/types';
import { Sidebar } from '@/components/admin/Sidebar';

const STAFF_ROLES: readonly string[] = [USER_ROLES.SUPER_ADMIN, USER_ROLES.DISPATCHER];

/**
 * Admin section layout — nested inside the root [locale]/layout (does NOT render
 * <html>/<body>). Server-side RBAC guard: unauthenticated → /login, non-staff →
 * home. Backend routes enforce the same roles; this is the front-of-house guard.
 */
export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) redirect(`/${locale}/login`);
  const role = (session.user as { role?: string }).role;
  if (!role || !STAFF_ROLES.includes(role)) redirect(`/${locale}`);

  const user = { name: session.user.name ?? null, email: session.user.email, role };

  return (
    <div className="flex min-h-screen">
      <Sidebar locale={locale} user={user} />
      <main className="flex-1 p-6 max-md:pt-20 md:p-8">{children}</main>
    </div>
  );
}
