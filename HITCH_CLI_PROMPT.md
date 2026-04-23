# Claude CLI Prompt — Hitch Monorepo Scaffold (npm version)

Copy and paste the prompt below into Claude CLI **from an empty directory** where you want the `hitch` project to live.

Before running: make sure you have these installed globally:
- Node.js 20+ (`node --version`)
- npm 10+ (comes with Node 20+, check with `npm --version`)
- Git (`git --version`)

---

## THE PROMPT

```
I want you to scaffold a production-grade monorepo for "Hitch", a ride-booking platform for the Iceland market (KEF Airport ↔ Reykjavík transfers). Read HITCH_MASTER_PLAN.md and CLAUDE_HITCH.md in this directory first — they are the source of truth for all decisions.

## Package Manager: npm (NOT pnpm, NOT yarn)

Use **npm workspaces** for the monorepo. All commands use npm. Do not install pnpm or yarn anywhere.

## Scope of this scaffold task

Create the FULL monorepo structure with working (but minimal) apps. Each app should boot successfully and display a placeholder page. Do NOT build full features yet — just the skeleton, configuration, and tooling so I can start developing immediately.

## Monorepo Structure

```
hitch/
├── apps/
│   ├── passenger/              # Next.js 15 — Public booking web (trilingual is/en/ar)
│   ├── dashboard/              # Next.js 15 — Admin/dispatcher panel (trilingual)
│   └── api/                    # Hono — Backend API + WebSocket server
│
├── packages/
│   ├── ui/                     # Shared Shadcn components (RTL-aware)
│   ├── types/                  # Shared TypeScript types + Zod schemas
│   ├── api-client/             # Shared TanStack Query hooks + WS client
│   ├── db/                     # Prisma schema + generated client
│   ├── auth/                   # Better Auth config
│   ├── i18n/                   # Shared translation keys & formatters
│   └── utils/                  # Geo, format, dates, currency helpers
│
├── package.json                # npm workspaces root
├── turbo.json                  # Turborepo config
├── tsconfig.base.json          # Shared TS config
├── .env.example
├── .gitignore
├── .npmrc                      # npm settings
├── README.md
├── HITCH_MASTER_PLAN.md        # Already exists, don't overwrite
└── CLAUDE.md                   # Copy from CLAUDE_HITCH.md
```

## Step-by-step execution

### Step 1: Initialize monorepo root

1. Run `npm init -y` and edit the root `package.json` to include:
   - `"name": "hitch"`
   - `"private": true`
   - `"workspaces": ["apps/*", "packages/*"]`
   - `"engines": { "node": ">=20.0.0", "npm": ">=10.0.0" }`
   - Scripts:
     ```json
     {
       "dev": "turbo run dev",
       "build": "turbo run build",
       "lint": "turbo run lint",
       "test": "turbo run test",
       "typecheck": "turbo run typecheck",
       "clean": "turbo run clean && rm -rf node_modules",
       "db:generate": "npm run generate -w @hitch/db",
       "db:migrate:dev": "npm run migrate:dev -w @hitch/db",
       "db:migrate:deploy": "npm run migrate:deploy -w @hitch/db",
       "db:studio": "npm run studio -w @hitch/db",
       "db:seed": "npm run seed -w @hitch/db"
     }
     ```
   - `devDependencies`: `turbo`, `typescript`, `@types/node`, `prettier`, `eslint`

2. Create `.npmrc` at the root with:
   ```
   legacy-peer-deps=false
   save-exact=false
   fund=false
   audit=false
   ```

3. Create `turbo.json`:
   ```json
   {
     "$schema": "https://turbo.build/schema.json",
     "tasks": {
       "build": {
         "dependsOn": ["^build"],
         "outputs": [".next/**", "!.next/cache/**", "dist/**"]
       },
       "dev": {
         "cache": false,
         "persistent": true
       },
       "lint": {},
       "test": {},
       "typecheck": {
         "dependsOn": ["^build"]
       },
       "clean": {
         "cache": false
       }
     }
   }
   ```

4. Create `tsconfig.base.json` with strict mode:
   - `"strict": true`
   - `"noUnusedLocals": true`
   - `"noUnusedParameters": true`
   - `"verbatimModuleSyntax": true`
   - `"moduleResolution": "bundler"`
   - `"target": "ES2022"`
   - `"lib": ["ES2022", "DOM", "DOM.Iterable"]`
   - `"skipLibCheck": true`
   - `"resolveJsonModule": true`
   - `"esModuleInterop": true`
   - `"isolatedModules": true`
   - Path aliases for `@hitch/*` pointing to `packages/*/src`

5. Create `.gitignore` covering: `node_modules`, `.next`, `dist`, `.turbo`, `.env`, `.env.local`, `.env.production` (NOT `.env.example`), `*.log`, `.DS_Store`, `coverage`. KEEP `prisma/migrations/migration_lock.toml`.

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
   5. `npm run dev`

   ## Apps
   - Passenger: http://localhost:3000
   - Dashboard: http://localhost:3002
   - API: http://localhost:3001

   See HITCH_MASTER_PLAN.md and CLAUDE.md for full architecture.
   ```

8. Copy `CLAUDE_HITCH.md` → `CLAUDE.md` at the root (so Claude CLI picks it up on every session).

### Step 2: Create `packages/db` (Prisma)

1. Create `packages/db/package.json` with:
   - `"name": "@hitch/db"`
   - `"version": "0.0.0"`
   - `"private": true`
   - `"main": "./src/index.ts"`
   - `"types": "./src/index.ts"`
   - Scripts: `generate`, `migrate:dev`, `migrate:deploy`, `studio`, `seed`, `typecheck`

2. Install (from inside `packages/db`):
   ```bash
   npm install prisma @prisma/client
   npm install -D tsx
   ```

3. Create `prisma/schema.prisma` with ALL models from HITCH_MASTER_PLAN.md section 8:
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

4. Add all indexes listed in HITCH_MASTER_PLAN.md section 8.

5. Create `src/index.ts` with the Prisma client singleton pattern:
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

6. Create `prisma/seed.ts` that creates:
   - One Super Admin user (email/password configurable via env)
   - Three PricingZones: "Keflavík Airport", "Reykjavík Center", "Blue Lagoon"
   - Sample exchange rates (ISK → EUR, ISK → USD)

7. Create `tsconfig.json` extending `../../tsconfig.base.json`.

### Step 3: Create `packages/types`

1. `packages/types/package.json`:
   - `"name": "@hitch/types"`
   - Depends on `@hitch/db` and `zod@^4`

2. Install:
   ```bash
   npm install zod@^4
   ```

3. Create `src/index.ts` re-exporting Prisma types:
   ```ts
   export type { User, Booking, Vehicle, Payment, DriverPayout } from '@hitch/db';
   export * from './constants';
   export * from './schemas';
   ```

4. Create `src/constants.ts` with `as const` objects:
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

   export const LOCALES = ['is', 'en', 'ar'] as const;
   export const DEFAULT_LOCALE = 'is';
   export const RTL_LOCALES = ['ar'] as const;

   export const CURRENCIES = ['ISK', 'EUR', 'USD'] as const;
   export const DEFAULT_CURRENCY = 'ISK';
   ```

5. Create `src/schemas/` folder with Zod schemas for common validations:
   - `bookingSchema.ts`, `searchParamsSchema.ts`, `userSchema.ts`

### Step 4: Create `packages/i18n`

1. `packages/i18n/package.json`:
   - `"name": "@hitch/i18n"`

2. Create `src/index.ts` exporting locale/currency constants (re-export from types) and format helpers:
   - `formatCurrency(amount, currency, locale)` — uses `Intl.NumberFormat` with `numberingSystem: 'latn'`, 0 decimals for ISK, 2 for EUR/USD
   - `formatNumber(num, locale)` — Western digits always
   - `formatDate(date, locale)` — Icelandic/English `dd.MM.yyyy`, Arabic `dd/MM/yyyy`
   - `formatDateTime(date, locale)` — 24-hour time

3. Create `messages/` folder with three placeholder JSON files:
   - `is.json`:
     ```json
     {
       "common": {
         "loading": "Hleður...",
         "error": "Villa kom upp",
         "retry": "Reyna aftur"
       },
       "landing": {
         "hero": {
           "title": "Frá flugvelli til Reykjavíkur",
           "subtitle": "Pantaðu bíl á nokkrum sekúndum"
         }
       }
     }
     ```
   - `en.json`:
     ```json
     {
       "common": {
         "loading": "Loading...",
         "error": "An error occurred",
         "retry": "Try again"
       },
       "landing": {
         "hero": {
           "title": "From airport to Reykjavík",
           "subtitle": "Book your ride in seconds"
         }
       }
     }
     ```
   - `ar.json`:
     ```json
     {
       "common": {
         "loading": "جاري التحميل...",
         "error": "حدث خطأ",
         "retry": "إعادة المحاولة"
       },
       "landing": {
         "hero": {
           "title": "من المطار إلى ريكيافيك",
           "subtitle": "احجز رحلتك في ثوانٍ"
         }
       }
     }
     ```

### Step 5: Create `packages/utils`

1. `packages/utils/package.json`:
   - `"name": "@hitch/utils"`

2. Install:
   ```bash
   npm install clsx tailwind-merge libphonenumber-js date-fns
   ```

3. Create utility modules:
   - `src/cn.ts` — `cn()` helper (clsx + tailwind-merge)
   - `src/geo.ts` — `calculateDistance(from, to)` haversine
   - `src/booking.ts` — `generateBookingCode()` returns `HTCH-XXXX-XXXX`
   - `src/phone.ts` — `formatPhoneNumber()` using libphonenumber-js, default `IS`

### Step 6: Create `packages/auth`

1. `packages/auth/package.json`:
   - `"name": "@hitch/auth"`

2. Install:
   ```bash
   npm install better-auth
   ```

3. Create `src/index.ts` exporting a Better Auth instance:
   - Database adapter: Prisma (import `prisma` from `@hitch/db`)
   - Providers: email/password + phone OTP
   - Session: 7 days rolling, 30 days absolute max
   - Extended user fields: `role`, `preferredLocale`, `preferredCurrency`

4. Export middleware helpers for Hono: `requireAuth`, `requireRole([...])`.

### Step 7: Create `packages/ui` (Shared Shadcn base)

1. `packages/ui/package.json`:
   - `"name": "@hitch/ui"`
   - Peer deps: `react`, `react-dom`

2. Install:
   ```bash
   npm install react react-dom @radix-ui/react-direction class-variance-authority clsx tailwind-merge lucide-react
   npm install -D @types/react @types/react-dom tailwindcss
   ```

3. Create `src/lib/utils.ts` with `cn()` helper (re-exported from `@hitch/utils` for consistency).

4. Create `src/styles/globals.css` with the Soft Pop theme:
   - `@import "tailwindcss"` at the top
   - `:root` with all light mode OKLCH tokens from CLAUDE_HITCH.md "Visual Identity"
   - `.dark` with dark mode tokens
   - `[lang="ar"]` setting `--font-sans-active: var(--font-sans-ar)`
   - Default `--font-sans-active: var(--font-sans)`
   - `.text-ltr` utility class for LTR content in RTL layouts
   - `@theme inline` block mapping CSS vars to Tailwind tokens

5. Create `src/components/ui/` folder (empty — apps populate via Shadcn CLI).

6. Export pattern:
   ```ts
   // src/index.ts
   export { cn } from './lib/utils';
   ```

### Step 8: Create `packages/api-client`

1. `packages/api-client/package.json`:
   - `"name": "@hitch/api-client"`

2. Install:
   ```bash
   npm install @tanstack/react-query partysocket
   ```

3. Create:
   - `src/routes.ts` — centralized typed API paths
   - `src/client.ts` — typed fetch wrapper with credentials, error handling, idempotency key support
   - `src/ws.ts` — WebSocket client using `partysocket` with channel subscription API
   - `src/hooks/` — empty placeholder, populated per feature
   - `src/index.ts` — barrel export

### Step 9: Create `apps/api` (Hono)

1. Create `apps/api/package.json`:
   - `"name": "@hitch/api"`
   - Scripts: `dev` (tsx watch src/index.ts), `build` (tsc), `start` (node dist/index.js), `typecheck`

2. Install:
   ```bash
   npm install hono @hono/node-server @hono/node-ws @hono/zod-validator better-auth bullmq ioredis stripe @aws-sdk/client-s3 @aws-sdk/s3-request-presigner zod
   npm install @hitch/db @hitch/types @hitch/auth @hitch/utils
   npm install -D tsx @types/node typescript
   ```

3. Create folder structure:
   ```
   src/
   ├── index.ts                 # Hono bootstrap + server start
   ├── routes/
   │   ├── auth.ts
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
       ├── prisma.ts
       └── stripe.ts
   ```

4. Each route file exports a Hono sub-app with placeholder endpoints.

5. `src/index.ts`:
   - Creates main Hono app
   - CORS middleware (allow localhost:3000 and localhost:3002 in dev)
   - Mounts Better Auth at `/api/auth/*`
   - Mounts route stubs: `/api/bookings`, `/api/drivers`, `/api/payments`, `/api/uploads`, `/api/exchange-rates`, `/api/webhooks/stripe`
   - Adds `GET /api/health` that returns `{ status: 'ok', version: process.env.npm_package_version }`
   - WebSocket upgrade handler at `/ws` using `@hono/node-ws`
   - Starts server on `process.env.PORT ?? 3001`

6. Placeholder `realtime/ws-server.ts` exports a function that accepts a WebSocket connection, validates auth, and adds basic subscribe/unsubscribe handlers.

### Step 10: Create `apps/passenger` (Next.js 15)

1. From the `apps/` directory, run:
   ```bash
   npx create-next-app@latest passenger --typescript --eslint --tailwind --src-dir --app --turbopack --import-alias "@/*" --no-git
   ```

2. Move into `apps/passenger` and install additional dependencies:
   ```bash
   npm install next-intl @tanstack/react-query @tanstack/react-query-devtools zustand react-hook-form @hookform/resolvers @radix-ui/react-direction lucide-react partysocket
   npm install @hitch/ui @hitch/types @hitch/api-client @hitch/i18n @hitch/utils
   ```

3. Set up next-intl:
   - Create `src/i18n/routing.ts`:
     ```ts
     import { defineRouting } from 'next-intl/routing';
     export const routing = defineRouting({
       locales: ['is', 'en', 'ar'],
       defaultLocale: 'is',
       localePrefix: 'always',
     });
     ```
   - Create `src/i18n/request.ts` for loading messages from `@hitch/i18n/messages/*.json`
   - Create `src/middleware.ts` using `createMiddleware` from next-intl
   - Update `next.config.ts` with `createNextIntlPlugin`

4. Restructure `app/` to `app/[locale]/`:
   - Move `app/layout.tsx` → `app/[locale]/layout.tsx`
   - Move `app/page.tsx` → `app/[locale]/page.tsx`
   - Keep root `app/layout.tsx` as minimal wrapper that just renders children

5. Update `app/[locale]/layout.tsx`:
   ```tsx
   import { DirectionProvider } from '@radix-ui/react-direction';
   import { NextIntlClientProvider } from 'next-intl';
   import { DM_Sans, Cairo, Space_Mono } from 'next/font/google';
   import { getMessages } from 'next-intl/server';
   import { notFound } from 'next/navigation';
   import { routing } from '@/i18n/routing';

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

6. Create `app/[locale]/page.tsx` as placeholder landing:
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

7. Create `src/providers.tsx` wrapping children in `QueryClientProvider`.

8. Update `src/app/globals.css` to import from `@hitch/ui`:
   ```css
   @import "@hitch/ui/src/styles/globals.css";
   ```

9. Initialize Shadcn in this app:
   ```bash
   npx shadcn@latest init
   ```
   Accept defaults. Then add the Button component as a test: `npx shadcn@latest add button`.

10. Update `next.config.ts` to transpile workspace packages:
    ```ts
    import createNextIntlPlugin from 'next-intl/plugin';
    const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

    const nextConfig = {
      transpilePackages: ['@hitch/ui', '@hitch/types', '@hitch/api-client', '@hitch/i18n', '@hitch/utils'],
    };

    export default withNextIntl(nextConfig);
    ```

### Step 11: Create `apps/dashboard` (Next.js 15)

Repeat Step 10 but for dashboard. Differences:
- `package.json` script: `"dev": "next dev --turbopack -p 3002"` (different port)
- Landing page redirects to `/{locale}/overview`
- Placeholder sidebar with links: Overview, Bookings, Drivers, Fleet, Pricing, Payments, Reports (all translated)
- Create `app/[locale]/overview/page.tsx` with placeholder text

### Step 12: Final touches

1. Create root `.eslintrc.json` with a reasonable base config (just `{ "root": true }` for now — per-package configs will handle specifics).

2. Create root `.prettierrc`:
   ```json
   { "semi": true, "singleQuote": true, "trailingComma": "all", "printWidth": 100 }
   ```

3. Verify all workspace packages reference each other correctly by running `npm install` at the root one more time. npm should link them via symlinks in `node_modules/@hitch/*`.

4. Run `npm run db:generate` — this should succeed even without a real DATABASE_URL (it generates the client from the schema).

5. Run `npm run typecheck` at the root — everything should pass.

6. Initialize git: `git init && git add . && git commit -m "feat: initial monorepo scaffold"`.

### Step 13: Verification (run these commands and report results)

- [ ] `npm install` completes without errors
- [ ] `npm run typecheck` passes across all packages
- [ ] `npm run dev -w passenger` starts Next.js on port 3000 and `/is` renders with Icelandic text
- [ ] `/ar` renders with Arabic text AND direction is RTL (check `<html dir="rtl">`)
- [ ] `npm run dev -w dashboard` starts Next.js on port 3002
- [ ] `npm run dev -w api` starts Hono on port 3001, `curl localhost:3001/api/health` returns `{ "status": "ok" }`
- [ ] `npm run db:generate` succeeds (set DATABASE_URL="file:./dev.db" temporarily if needed)
- [ ] Workspace packages import correctly: passenger app can `import { formatCurrency } from '@hitch/i18n'` without TS errors

## Important rules

- Use **npm only** — no pnpm, no yarn
- Use TypeScript strict mode everywhere
- Don't add unnecessary dependencies — stick to what's listed
- Every package must have: `package.json`, `tsconfig.json`, `src/index.ts`
- Don't create routes/components beyond the placeholders described — the user will build those
- When in doubt about any architectural decision, consult HITCH_MASTER_PLAN.md section-by-section
- Make sure everything works end-to-end before declaring done — run the commands in Step 13 and fix any errors before finishing
- npm workspaces symlink packages into the root `node_modules/@hitch/*` — if imports fail, re-run `npm install` at the root

## Known npm workspaces gotchas to handle

- **Peer dependency warnings**: npm workspaces can be noisier than pnpm. Ignore peer dep warnings unless they block installation.
- **Workspace linking**: if `@hitch/db` can't be found by `@hitch/auth`, re-run `npm install` at the root — don't run `npm install` inside individual packages (it breaks the workspace linkage).
- **TypeScript project references**: not needed for this scaffold — path aliases in `tsconfig.base.json` are sufficient. If you see import errors in VS Code, restart the TS server.

## Report back

When done, print a clear summary of:
1. Total packages created
2. Any warnings or issues encountered
3. Exact commands the user needs to run to start development
4. What was left as placeholder and needs to be built next

Start now.
```

---

## After the scaffold is done

Once Claude CLI finishes, here's what you'll do next:

### 1. Set up Railway
- Create a new Railway project
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
npm run dev
```

You'll have three apps running:
- `http://localhost:3000` — Passenger web
- `http://localhost:3001` — Hono API
- `http://localhost:3002` — Dashboard

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
   - npm workspace linkage issues → run `rm -rf node_modules package-lock.json && npm install` at root

5. **Review before committing** — once done, look through the structure, verify everything matches the plan.
