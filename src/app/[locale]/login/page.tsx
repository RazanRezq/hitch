import { SignIn } from '@clerk/nextjs';
import { setRequestLocale } from 'next-intl/server';
import { routing, type AppLocale } from '@/i18n/routing';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Admin sign-in. Embedded Clerk <SignIn/> (email/password configured in the
 * Clerk dashboard). Hash routing keeps every step on this URL so we don't need
 * a catch-all route or locale-aware Clerk URL config. On success → /{locale}/admin.
 */
export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <SignIn routing="hash" forceRedirectUrl={`/${locale as AppLocale}/admin`} />
    </main>
  );
}
