import { SignIn } from '@clerk/nextjs';

/**
 * Staff/driver sign-in (Clerk, email/password). Catch-all so Clerk handles its
 * own sub-steps. Default destination is /{locale}/admin (dispatchers); surfaces
 * that gate on other roles (the driver page) pass a same-site `redirect_url` to
 * come back to themselves. Passengers book as guests and never sign in here.
 */
export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const { locale } = await params;
  const { redirect_url: redirectUrl } = await searchParams;
  // Same-site relative paths only — anything else keeps the /admin default.
  const target =
    redirectUrl && redirectUrl.startsWith('/') && !redirectUrl.startsWith('//')
      ? redirectUrl
      : `/${locale}/admin`;
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <SignIn forceRedirectUrl={target} />
    </div>
  );
}
