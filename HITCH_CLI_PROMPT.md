# Claude CLI Prompt — Hitch Single-App Scaffold (npm version)

Copy and paste the prompt below into Claude CLI **from an empty directory** where you want the `hitch` project to live.

Before running: make sure you have these installed globally:
- Node.js 20+ (`node --version`)
- npm 10+ (comes with Node 20+, check with `npm --version`)
- Git (`git --version`)

---

## THE PROMPT

```
I want you to scaffold a production-grade Next.js app for "Hitch", a ride-booking platform for the Iceland market (KEF Airport ↔ Reykjavík transfers). Read HITCH_MASTER_PLAN.md and CLAUDE_HITCH.md in this directory first — they are the source of truth for all decisions.

## Package Manager: npm (NOT pnpm, NOT yarn)

Use **plain npm**. No workspaces. No Turborepo. No pnpm. One `package.json` at the repo root.

## Scope of this scaffold task

Create a single Next.js 16 app at the repo root that boots successfully and displays a placeholder trilingual landing page, with a Hono backend mounted inside it, a standalone WebSocket runner, and a BullMQ workers entry point. Do NOT build full features yet — just the skeleton, configuration, and tooling so I can start developing immediately.

## Repo structure (canonical)

```
hitch/
├── package.json                # plain npm, no workspaces
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
├── .env.example
├── .gitignore
├── .npmrc
├── README.md
├── HITCH_MASTER_PLAN.md        # Already exists, don't overwrite
├── CLAUDE.md                   # Copy from CLAUDE_HITCH.md
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── messages/                   # next-intl messages
│   ├── is.json
│   ├── en.json
│   └── ar.json
├── public/
└── src/
    ├── app/
    │   ├── [locale]/                  # passenger surface (root layout owns <html>/<body>)
    │   │   ├── layout.tsx
    │   │   ├── page.tsx
    │   │   └── admin/                 # dispatcher/admin nested here
    │   │       ├── layout.tsx         # nested-only, NO <html>/<body>
    │   │       ├── page.tsx           # redirects to ./overview
    │   │       └── overview/page.tsx
    │   ├── api/[[...route]]/route.ts  # Hono mounted via hono/vercel handle()
    │   ├── globals.css
    │   └── editorial.css
    ├── components/                    # passenger + admin/Sidebar + landing/* + brand/*
    ├── i18n/
    │   ├── routing.ts
    │   └── request.ts
    ├── lib/                           # local libraries (was packages/* in the old monorepo)
    │   ├── ui/                        # Shared Shadcn + Soft Pop CSS
    │   ├── types/                     # Shared TS types + Zod schemas
    │   ├── db/                        # Prisma client singleton
    │   ├── auth/                      # Better Auth config
    │   ├── utils/                     # Geo, format, dates, currency helpers
    │   ├── i18n-shared/               # Locale + currency constants and formatters
    │   └── api-client/                # TanStack Query hooks + WS client
    ├── server/                        # backend (Hono)
    │   ├── app.ts                     # bare Hono app
    │   ├── index.ts                   # standalone WS runner (npm run ws)
    │   ├── routes/
    │   ├── services/
    │   ├── middleware/
    │   ├── realtime/
    │   ├── workers/
    │   └── lib/
    ├── stores/
    ├── providers.tsx
    └── proxy.ts
```

Import-alias rule: `@/lib/ui`, `@/lib/types`, `@/lib/db`, `@/lib/auth`, `@/lib/utils`, `@/lib/i18n-shared`, `@/lib/api-client`. Do NOT introduce `@hitch/*` aliases — there is no monorepo.

> CSS `@import` does NOT respect TS path aliases — use relative paths inside `.css` files (e.g. `src/app/globals.css` does `@import '../lib/ui/styles/globals.css';`).

## Step-by-step execution

### Step 1: Initialize the Next.js app

1. From the empty target directory, scaffold Next.js 16:
   ```bash
   npx create-next-app@latest . --typescript --eslint --tailwind --src-dir --app --turbopack --import-alias "@/*" --no-git --use-npm
   ```

2. Edit the root `package.json`:
   - `"name": "hitch"`
   - `"private": true`
   - `"engines": { "node": ">=20.0.0", "npm": ">=10.0.0" }`
   - Scripts:
     ```json
     {
       "dev": "next dev --turbopack",
       "build": "next build",
       "start": "next start",
       "lint": "next lint",
       "test": "vitest run",
       "typecheck": "tsc --noEmit",
       "ws": "tsx src/server/index.ts",
       "workers": "tsx src/server/workers/index.ts",
       "db:generate": "prisma generate",
       "db:migrate:dev": "prisma migrate dev",
       "db:migrate:deploy": "prisma migrate deploy",
       "db:studio": "prisma studio",
       "db:seed": "tsx prisma/seed.ts"
     }
     ```
   - Add `tsx` and `vitest` to `devDependencies`.

3. Create `.npmrc` at the root with:
   ```
   legacy-peer-deps=false
   save-exact=false
   fund=false
   audit=false
   ```

4. Update `tsconfig.json` to enforce strict mode:
   - `"strict": true`
   - `"noUnusedLocals": true`
   - `"noUnusedParameters": true`
   - `"verbatimModuleSyntax": true`
   - Keep the default `"paths": { "@/*": ["./src/*"] }` — that single alias covers everything.

5. Update `.gitignore` to cover: `node_modules`, `.next`, `dist`, `.env`, `.env.local`, `.env.production` (NOT `.env.example`), `*.log`, `.DS_Store`, `coverage`. KEEP `prisma/migrations/migration_lock.toml`.

6. Create `.env.example` with all variables from CLAUDE_HITCH.md section "Environment Variables" with placeholder values and inline comments.

7. Create `README.md` with setup instructions:
   ```markdown
   # Hitch

   Ride-booking platform for KEF ↔ Reykjavík transfers.

   ## Prerequisites
   - Node.js 20+
   - npm 10+

   ## Setup
   1. `npm install`
   2. `cp .env.example .env` and fill in values
   3. `npm run db:generate`
   4. `npm run db:migrate:dev` (requires DATABASE_URL)
   5. `npm run dev`           # Next.js (web + mounted Hono API) on :3000
   6. `npm run ws`            # WebSocket process (separate)
   7. `npm run workers`       # BullMQ workers (separate)

   See HITCH_MASTER_PLAN.md and CLAUDE.md for full architecture.
   ```

8. Copy `CLAUDE_HITCH.md` → `CLAUDE.md` at the root (so Claude CLI picks it up on every session).

### Step 2: Set up Prisma (`prisma/` + `src/lib/db`)

1. Install:
   ```bash
   npm install prisma @prisma/client
   ```

2. Create `prisma/schema.prisma` with ALL models from HITCH_MASTER_PLAN.md section 8:
   - `User` (with `role`, `preferredLocale`, `preferredCurrency`, `stripeCustomerId`, etc.)
   - `Vehicle`
   - `Booking` (with `basePriceISK`, `displayCurrency`, `displayPrice`, `exchangeRate`, full status enum)
   - `BookingEvent`
   - `Payment` (with `amount`, `currency`, `amountISK`)
   - `DriverPayout`
   - `DriverLocation`
   - `TripLocationHistory`
   - `DriverDocument`
   - `Rating`
   - `PricingZone` (with localized `name` as Json)
   - `PromoCode`
   - `PromoRedemption`
   - `ExchangeRate`
   - Better Auth required tables (Session, Account, Verification)

   Note: Prisma `enum` is fine to use — the "no enum" rule in CLAUDE.md is for TypeScript files only.

3. Add all indexes listed in HITCH_MASTER_PLAN.md section 8.

4. Create `src/lib/db/index.ts` with the Prisma client singleton pattern:
   ```ts
   import { PrismaClient } from '@prisma/client';

   const globalForPrisma = globalThis as unknown as {
     prisma: PrismaClient | undefined;
   };

   export const prisma = globalForPrisma.prisma ?? new PrismaClient({
     log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
   });

   if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

   export * from '@prisma/client';
   ```

5. Create `prisma/seed.ts` that creates:
   - One Super Admin user (email/password configurable via env)
   - Three PricingZones: "Keflavík Airport", "Reykjavík Center", "Blue Lagoon"
   - Sample exchange rates (ISK → EUR, ISK → USD)

### Step 3: `src/lib/types` (shared types + constants + Zod)

1. Install:
   ```bash
   npm install zod@^4
   ```

2. Create `src/lib/types/index.ts` re-exporting Prisma types:
   ```ts
   export type { User, Booking, Vehicle, Payment, DriverPayout } from '@/lib/db';
   export * from './constants';
   export * from './schemas';
   ```

3. Create `src/lib/types/constants.ts` with `as const` objects:
   ```ts
   export const USER_ROLES = {
     SUPER_ADMIN: 'SUPER_ADMIN',
     DISPATCHER: 'DISPATCHER',
     DRIVER: 'DRIVER',
     PASSENGER: 'PASSENGER',
   } as const;
   export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

   export const BOOKING_STATUSES = {
     DRAFT: 'DRAFT',
     PENDING_PAYMENT: 'PENDING_PAYMENT',
     CONFIRMED: 'CONFIRMED',
     // ... all 14 statuses
   } as const;

   export const VEHICLE_TYPES = {
     SEDAN: 'SEDAN',
     SUV: 'SUV',
     VAN: 'VAN',
   } as const;
   ```

4. Create `src/lib/types/schemas/` folder with Zod schemas for common validations:
   - `bookingSchema.ts`, `searchParamsSchema.ts`, `userSchema.ts`

### Step 4: `src/lib/i18n-shared` + `messages/` + `src/i18n/`

1. Install:
   ```bash
   npm install next-intl
   ```

2. Create `src/lib/i18n-shared/locales.ts`:
   ```ts
   export const LOCALES = ['is', 'en', 'ar'] as const;
   export const DEFAULT_LOCALE = 'is';
   export const RTL_LOCALES = ['ar'] as const;
   export type Locale = typeof LOCALES[number];
   ```

3. Create `src/lib/i18n-shared/currencies.ts`:
   ```ts
   export const CURRENCIES = ['ISK', 'EUR', 'USD'] as const;
   export const DEFAULT_CURRENCY = 'ISK';
   export type Currency = typeof CURRENCIES[number];
   ```

4. Create `src/lib/i18n-shared/format.ts` exporting:
   - `formatCurrency(amount, currency, locale)` — uses `Intl.NumberFormat` with `numberingSystem: 'latn'`, 0 decimals for ISK, 2 for EUR/USD
   - `formatNumber(num, locale)` — Western digits always
   - `formatDate(date, locale)` — Icelandic/English `dd.MM.yyyy`, Arabic `dd/MM/yyyy`
   - `formatDateTime(date, locale)` — 24-hour time

5. Create `src/i18n/routing.ts`:
   ```ts
   import { defineRouting } from 'next-intl/routing';
   import { LOCALES, DEFAULT_LOCALE } from '@/lib/i18n-shared/locales';
   export const routing = defineRouting({
     locales: LOCALES,
     defaultLocale: DEFAULT_LOCALE,
     localePrefix: 'always',
   });
   ```

6. Create `src/i18n/request.ts` loading messages from `../../messages/*.json`.

7. Create `src/middleware.ts` using `createMiddleware` from next-intl.

8. Update `next.config.ts` with `createNextIntlPlugin('./src/i18n/request.ts')`.

9. Create `messages/is.json`, `en.json`, `ar.json` with placeholder content:
   ```json
   // messages/is.json
   {
     "common": { "loading": "Hleður...", "error": "Villa kom upp", "retry": "Reyna aftur" },
     "landing": { "hero": { "title": "Frá flugvelli til Reykjavíkur", "subtitle": "Pantaðu bíl á nokkrum sekúndum" } }
   }

   // messages/en.json
   {
     "common": { "loading": "Loading...", "error": "An error occurred", "retry": "Try again" },
     "landing": { "hero": { "title": "From airport to Reykjavík", "subtitle": "Book your ride in seconds" } }
   }

   // messages/ar.json
   {
     "common": { "loading": "جاري التحميل...", "error": "حدث خطأ", "retry": "إعادة المحاولة" },
     "landing": { "hero": { "title": "من المطار إلى ريكيافيك", "subtitle": "احجز رحلتك في ثوانٍ" } }
   }
   ```

### Step 5: `src/lib/utils` (small helpers)

1. Install:
   ```bash
   npm install clsx tailwind-merge libphonenumber-js date-fns
   ```

2. Create utility modules:
   - `src/lib/utils/cn.ts` — `cn()` helper (clsx + tailwind-merge)
   - `src/lib/utils/geo.ts` — `calculateDistance(from, to)` haversine
   - `src/lib/utils/booking.ts` — `generateBookingCode()` returns `HTCH-XXXX-XXXX`
   - `src/lib/utils/phone.ts` — `formatPhoneNumber()` using libphonenumber-js, default `IS`
   - `src/lib/utils/index.ts` — barrel export

### Step 6: `src/lib/auth` (Better Auth)

1. Install:
   ```bash
   npm install better-auth
   ```

2. Create `src/lib/auth/index.ts` exporting a Better Auth instance:
   - Database adapter: Prisma (import `prisma` from `@/lib/db`)
   - Providers: email/password + phone OTP
   - Session: 7 days rolling, 30 days absolute max
   - Extended user fields: `role`, `preferredLocale`, `preferredCurrency`

3. Export middleware helpers for Hono: `requireAuth`, `requireRole([...])`.

### Step 7: `src/lib/ui` (Shadcn base + Soft Pop theme)

1. Install:
   ```bash
   npm install @radix-ui/react-direction class-variance-authority lucide-react
   ```

2. Create `src/lib/ui/lib/utils.ts` that re-exports `cn` from `@/lib/utils`.

3. Create `src/lib/ui/styles/globals.css` with the Soft Pop theme:
   - `@import "tailwindcss"` at the top
   - `:root` with all light mode OKLCH tokens from CLAUDE_HITCH.md "Visual Identity"
   - `.dark` with dark mode tokens
   - `[lang="ar"]` setting `--font-sans-active: var(--font-sans-ar)`
   - Default `--font-sans-active: var(--font-sans)`
   - `.text-ltr` utility class for LTR content in RTL layouts
   - `@theme inline` block mapping CSS vars to Tailwind tokens

4. Have `src/app/globals.css` import the theme via a RELATIVE path (CSS `@import` does not honor TS aliases):
   ```css
   @import '../lib/ui/styles/globals.css';
   ```

5. Initialize Shadcn from the repo root:
   ```bash
   npx shadcn@latest init
   ```
   Accept defaults. Then add the Button component as a test: `npx shadcn@latest add button`. Generated components land under `src/components/ui/`.

### Step 8: `src/lib/api-client` (TanStack Query + WS client)

1. Install:
   ```bash
   npm install @tanstack/react-query @tanstack/react-query-devtools partysocket
   ```

2. Create:
   - `src/lib/api-client/routes.ts` — centralized typed API paths (all start with `/api/...`)
   - `src/lib/api-client/client.ts` — typed fetch wrapper with credentials, error handling, idempotency key support
   - `src/lib/api-client/ws.ts` — WebSocket client using `partysocket` with channel subscription API. Defaults to `NEXT_PUBLIC_WS_URL` (the separate WS process, NOT the Next.js origin).
   - `src/lib/api-client/hooks/` — empty placeholder, populated per feature
   - `src/lib/api-client/index.ts` — barrel export

### Step 9: Hono backend at `src/server/`

1. Install:
   ```bash
   npm install hono @hono/node-server @hono/node-ws @hono/zod-validator bullmq ioredis stripe @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
   ```

2. Create the folder structure:
   ```
   src/server/
   ├── app.ts                     # bare Hono app — used by Next.js route AND WS runner
   ├── index.ts                   # standalone server bootstrap for WS (npm run ws)
   ├── routes/
   │   ├── auth.ts                # Better Auth handler
   │   ├── bookings.ts
   │   ├── drivers.ts
   │   ├── payments.ts
   │   ├── uploads.ts
   │   ├── exchange-rates.ts
   │   └── webhooks/stripe.ts
   ├── realtime/
   │   ├── ws-server.ts
   │   ├── channels.ts
   │   └── redis-pubsub.ts
   ├── services/
   │   ├── dispatch/index.ts
   │   ├── pricing/index.ts
   │   ├── payments/index.ts
   │   ├── currency/index.ts
   │   └── storage/index.ts
   ├── workers/
   │   ├── index.ts               # npm run workers entrypoint
   │   ├── dispatch.worker.ts
   │   ├── payout.worker.ts
   │   ├── webhook.worker.ts
   │   └── exchange-rate.worker.ts
   ├── middleware/
   │   ├── auth.ts
   │   ├── rbac.ts
   │   ├── locale.ts
   │   └── idempotency.ts
   └── lib/
       ├── redis.ts
       ├── prisma.ts              # re-exports from @/lib/db
       └── stripe.ts
   ```

3. `src/server/app.ts`:
   - Creates the main Hono app
   - Mounts Better Auth at `/api/auth/*`
   - Mounts route stubs: `/api/bookings`, `/api/drivers`, `/api/payments`, `/api/uploads`, `/api/exchange-rates`, `/api/webhooks/stripe`
   - Adds `GET /api/health` that returns `{ status: 'ok' }`
   - Exports the `app` instance (does NOT call `serve()` — that's the job of `index.ts` / the Next.js route).

4. Each route file exports a Hono sub-app with placeholder endpoints.

5. Mount Hono inside Next.js at `src/app/api/[[...route]]/route.ts`:
   ```ts
   import { handle } from 'hono/vercel';
   import { app } from '@/server/app';

   export const runtime = 'nodejs';

   export const GET = handle(app);
   export const POST = handle(app);
   export const PATCH = handle(app);
   export const PUT = handle(app);
   export const DELETE = handle(app);
   export const OPTIONS = handle(app);
   ```

6. `src/server/index.ts` (the standalone WS runner, `npm run ws`):
   - Imports the same `app` from `./app.ts`
   - Uses `@hono/node-server` + `@hono/node-ws` to attach a WebSocket upgrade handler at `/ws`
   - Validates Better Auth session on connect, then dispatches to handlers under `realtime/`
   - Listens on `process.env.WS_PORT ?? 3001`

7. `src/server/workers/index.ts` (the BullMQ runner, `npm run workers`):
   - Boots all workers (dispatch, payout, webhook, exchange-rate)
   - Reuses Prisma + Redis singletons

### Step 10: Passenger surface (`src/app/[locale]/`)

1. Install:
   ```bash
   npm install zustand react-hook-form @hookform/resolvers
   ```

2. Replace the default `src/app/layout.tsx` with a minimal pass-through, or delete it — the root layout for the user-visible app lives at `src/app/[locale]/layout.tsx` (it owns `<html>`/`<body>`).

3. `src/app/[locale]/layout.tsx`:
   ```tsx
   import { DirectionProvider } from '@radix-ui/react-direction';
   import { NextIntlClientProvider } from 'next-intl';
   import { DM_Sans, Cairo, Space_Mono } from 'next/font/google';
   import { getMessages } from 'next-intl/server';
   import { notFound } from 'next/navigation';
   import { routing } from '@/i18n/routing';
   import '../globals.css';

   const dmSans = DM_Sans({ subsets: ['latin', 'latin-ext'], variable: '--font-sans' });
   const cairo = Cairo({ subsets: ['arabic'], variable: '--font-sans-ar' });
   const spaceMono = Space_Mono({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-mono' });

   export default async function LocaleLayout({
     children,
     params,
   }: {
     children: React.ReactNode;
     params: Promise<{ locale: string }>;
   }) {
     const { locale } = await params;
     if (!routing.locales.includes(locale as any)) notFound();
     const dir = locale === 'ar' ? 'rtl' : 'ltr';
     const messages = await getMessages();

     return (
       <html lang={locale} dir={dir} className={`${dmSans.variable} ${cairo.variable} ${spaceMono.variable}`}>
         <body>
           <DirectionProvider dir={dir}>
             <NextIntlClientProvider messages={messages}>
               {children}
             </NextIntlClientProvider>
           </DirectionProvider>
         </body>
       </html>
     );
   }
   ```

4. `src/app/[locale]/page.tsx` as placeholder landing:
   ```tsx
   import { useTranslations } from 'next-intl';

   export default function HomePage() {
     const t = useTranslations('landing.hero');
     return (
       <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
         <h1 className="text-4xl font-bold text-center">{t('title')}</h1>
         <p className="text-lg text-muted-foreground text-center">{t('subtitle')}</p>
         <p className="text-sm text-muted-foreground mt-8">Landing page coming soon</p>
       </main>
     );
   }
   ```

5. Create `src/providers.tsx` wrapping children in `QueryClientProvider`.

### Step 11: Admin surface (nested under passenger)

The dashboard is NOT a separate app — it's nested at `src/app/[locale]/admin/`.

1. `src/app/[locale]/admin/layout.tsx`:
   - Wraps children in a sidebar shell from `src/components/admin/Sidebar.tsx`
   - Renders **only** the admin chrome — it MUST NOT emit `<html>` or `<body>` (the locale layout above already owns those)
   - Adds an RBAC guard that requires role ∈ `[SUPER_ADMIN, DISPATCHER]`

2. `src/app/[locale]/admin/page.tsx` redirects to `./overview`.

3. `src/app/[locale]/admin/overview/page.tsx` placeholder for the live dispatch map.

4. `src/components/admin/Sidebar.tsx` with translated links: Overview, Bookings, Drivers, Fleet, Pricing, Payments, Reports.

### Step 12: Final touches

1. Update `eslint.config.mjs` for the Next.js + strict TS setup. Keep it minimal.

2. Create `.prettierrc`:
   ```json
   { "semi": true, "singleQuote": true, "trailingComma": "all", "printWidth": 100 }
   ```

3. Run `npm install` once at the root to confirm everything resolves.

4. Run `npm run db:generate` — this should succeed even without a real DATABASE_URL (it generates the client from the schema).

5. Run `npm run typecheck` — everything should pass.

6. Initialize git: `git init && git add . && git commit -m "feat: initial scaffold"`.

### Step 13: Verification (run these commands and report results)

- [ ] `npm install` completes without errors
- [ ] `npm run typecheck` passes
- [ ] `npm run dev` starts Next.js on port 3000; `/is` renders with Icelandic text
- [ ] `/ar` renders with Arabic text AND direction is RTL (check `<html dir="rtl">`)
- [ ] `/is/admin` redirects to `/is/admin/overview` and shows the placeholder
- [ ] `curl http://localhost:3000/api/health` returns `{ "status": "ok" }` (Hono mounted inside Next.js)
- [ ] `npm run ws` boots the standalone WebSocket server on its own port without crashing
- [ ] `npm run workers` boots the BullMQ workers entry without crashing
- [ ] `npm run db:generate` succeeds (set `DATABASE_URL="file:./dev.db"` temporarily if needed)
- [ ] An app file can `import { formatCurrency } from '@/lib/i18n-shared/format'` without TS errors

## Important rules

- Use **npm only** — no pnpm, no yarn, no workspaces, no Turborepo
- One `package.json` at the repo root. Do NOT add `apps/` or sub-package `package.json` files.
- Use TypeScript strict mode everywhere
- Don't add unnecessary dependencies — stick to what's listed
- Every directory under `src/lib/*` should have an `index.ts` barrel where it makes sense
- Don't create routes/components beyond the placeholders described — the user will build those
- When in doubt about any architectural decision, consult HITCH_MASTER_PLAN.md section-by-section
- Make sure everything works end-to-end before declaring done — run the commands in Step 13 and fix any errors before finishing

## Known gotchas to handle

- **CSS `@import` does not respect TS path aliases** — `src/app/globals.css` must use a relative path (`../lib/ui/styles/globals.css`), NOT `@/lib/...`
- **Nested layouts cannot emit `<html>`/`<body>`** — only `src/app/[locale]/layout.tsx` owns those tags; `src/app/[locale]/admin/layout.tsx` must be a chrome-only wrapper
- **WebSockets cannot live in Next.js route handlers** — that's why we have a separate `npm run ws` process. The Hono `app` is shared, the transport is different.
- **BullMQ must NOT run inside Next.js route handlers** — workers boot via `npm run workers`

## Report back

When done, print a clear summary of:
1. Files created (top-level + key paths under `src/`)
2. Any warnings or issues encountered
3. Exact commands the user needs to run to start development (web / ws / workers)
4. What was left as placeholder and needs to be built next

Start now.
```

---

## After the scaffold is done

Once Claude CLI finishes, here's what you'll do next:

### 1. Set up Railway
- Create a new Railway project with three services from this repo: `web` (`npm run start`), `ws` (`npm run ws`), `workers` (`npm run workers`)
- Add PostgreSQL service → copy `DATABASE_URL` to `.env`
- Add Redis service → copy `REDIS_URL` to `.env`

### 2. Set up DigitalOcean Spaces
- Create a Space in Frankfurt (`fra1`) region named `hitch-dev` (for now)
- Generate Spaces access keys → add to `.env`

### 3. Set up Stripe
- Create a test mode account
- Copy publishable + secret keys to `.env`

### 4. Run migrations
```bash
npm run db:migrate:dev -- --name init
```

### 5. Start developing
```bash
npm run dev        # Next.js (web + mounted Hono API) on :3000
npm run ws         # WebSocket process (in a separate terminal)
npm run workers    # BullMQ workers (in a separate terminal)
```

You'll have one Next.js origin serving everything user-facing:
- `http://localhost:3000/is` — Passenger landing (Icelandic)
- `http://localhost:3000/en/admin` — Admin / dispatcher
- `http://localhost:3000/api/health` — Hono health check

### 6. Next feature to build
Once the scaffold is verified, start with the **passenger landing page** — the three preset cards + search widget.

---

## Tips for using this prompt

1. **Run it in an empty folder** — Claude CLI will scaffold into the current directory.

2. **Have the context files present** — make sure `HITCH_MASTER_PLAN.md` and `CLAUDE_HITCH.md` are in the folder before running.

3. **Expect 15-30 minutes** — it's a substantial scaffold. Let it run.

4. **If it gets stuck** — common issues:
   - Node version too old → upgrade to 20+
   - Port conflicts → kill other dev servers first
   - Prisma generate fails → add `DATABASE_URL="file:./dev.db"` to `.env` temporarily
   - CSS import errors → confirm `src/app/globals.css` uses a RELATIVE path to `src/lib/ui/styles/globals.css`, not a `@/` alias

5. **Review before committing** — once done, look through the structure, verify everything matches the plan.
