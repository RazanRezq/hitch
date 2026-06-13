import { SignIn } from '@clerk/nextjs';

/**
 * Admin sign-in (Clerk, email/password). Catch-all so Clerk handles its own
 * sub-steps. On success → /{locale}/admin (the only place sign-in leads, since
 * passengers book as guests). Sign-up is gated to PASSENGER by default and
 * can't reach /admin without a staff role.
 */
export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <SignIn forceRedirectUrl={`/${locale}/admin`} />
    </div>
  );
}
