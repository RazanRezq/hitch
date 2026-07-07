import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { USER_ROLES } from '@/lib/types';

/**
 * Driver section layout — nested inside the root [locale]/layout (does NOT
 * render <html>/<body>). Server-side RBAC gate mirroring admin/layout.tsx:
 * Clerk session → Postgres User (by clerkId) → role must be DRIVER.
 * Unauthenticated → /sign-in (returned here after signing in); non-drivers →
 * home. The /api/driver/* routes enforce the same role server-side; this is
 * the front-of-house guard.
 */
export default async function DriverLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    redirect(`/${locale}/sign-in?redirect_url=${encodeURIComponent(`/${locale}/driver`)}`);
  }

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
    select: { role: true },
  });
  if (!dbUser || dbUser.role !== USER_ROLES.DRIVER) redirect(`/${locale}`);

  return <div className="min-h-screen bg-background">{children}</div>;
}
