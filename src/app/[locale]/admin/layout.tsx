import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { USER_ROLES } from '@/lib/types';
import { Sidebar } from '@/components/admin/Sidebar';

const STAFF_ROLES: readonly string[] = [USER_ROLES.SUPER_ADMIN, USER_ROLES.DISPATCHER];

/**
 * Admin section layout — nested inside the root [locale]/layout. Does NOT render
 * <html>/<body>/<NextIntlClientProvider> (the root layout already handles that).
 *
 * Server-side RBAC gate: Clerk session → Postgres User (by clerkId) → role.
 * Unauthenticated → /login; non-staff → home. The /api/admin/* routes enforce
 * the same roles server-side; this is the front-of-house guard.
 */
export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) redirect(`/${locale}/sign-in`);

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
    select: { role: true },
  });
  if (!dbUser || !STAFF_ROLES.includes(dbUser.role)) redirect(`/${locale}`);

  return (
    <div className="flex min-h-screen">
      <Sidebar locale={locale} />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
