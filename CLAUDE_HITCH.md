# CLAUDE.md — Hitch Ride-Booking Platform

> **READ THIS ENTIRE FILE before writing, modifying, or suggesting ANY code.**
> These rules are NON-NEGOTIABLE for functional correctness. Everything else is a canvas.
> Last updated: April 2026

## ⚡ RULES CONFIRMATION

**Always start your first response with:**

```
=== 🔥 Hitch Rules Applied 🔥 ===
```

This confirms you have read and will follow this entire file.

---

## 🎨 Creative Freedom (READ CAREFULLY)

This file defines **system boundaries** (stack, types, security, real-time, payments, RTL, i18n) — NOT the creative ceiling. **When in doubt, lean bold, not safe.**

### The default AI mistake

When AI reads rules like "use tokens only" or "200ms transitions," it interprets them as absolute limits and produces generic UI. **Don't do that.** Read them as *functional UI constraints*, not aesthetic ones.

### Creative latitude by context

| Context | Creative Budget | What's Allowed |
|---|---|---|
| **Passenger landing page, hero sections, onboarding, success moments, empty states, confirmation screens, 404/error pages, marketing** | **MAX** | Hardcoded colors, custom display fonts, unusual layouts, gradient meshes, grain textures, asymmetry, long staged animations (up to 1.5s), signature "delight moments" |
| **Booking flow, quote page, live tracking, account pages, dashboard overview** | **BALANCED** | Tokens for functional UI (buttons/inputs/borders), creative freedom for hero cards, featured content, map treatments, stat cards, one signature moment per page |
| **Forms, tables, settings, lists, admin panels, modals, data tables** | **STRICT** | Tokens only, subtle animations on hover/focus/validation, predictable patterns — dispatchers need speed |

### Specific permissions

- **Break the grid when it serves the design** — especially on the passenger landing page
- **Hardcoded colors ALLOWED** for decorative elements (hero gradients, empty state illustrations, map overlays, trip success moments)
- **Custom display fonts ALLOWED** for hero headings, marketing copy, editorial layouts — in addition to required DM Sans / Cairo / Space Mono for functional UI
- **Animation timing is intent-driven, not millisecond-capped** — a 1.2s staged reveal is fine if it communicates something. Only hard rule: respect `prefers-reduced-motion`.
- **Signature moments are expected, not optional**
- **Iceland-inspired aesthetic welcome** — think northern lights, volcanic landscapes, minimalist Nordic design. Not required, but encouraged.

### Context: the passenger

- Often tourists arriving at KEF after a long flight, tired, with luggage
- May not speak Icelandic — need instant language clarity
- Stressed: they need a ride NOW, not in 5 minutes of clicking
- Calm, reassuring, clear UI beats flashy and clever

---

## 🏗️ PROJECT CONTEXT

**Hitch** is a ride-booking platform for the **Iceland market**, specifically the Keflavík Airport (KEF) ↔ Reykjavík transfer corridor.

### Platform Surfaces

| Surface | Platform | Priority |
|---|---|---|
| Passenger Web | Next.js 15 | ✅ Phase 1 |
| Management Dashboard | Next.js 15 | ✅ Phase 1 |
| Passenger App | React Native + Expo | 🔜 Phase 2 |
| Driver App | React Native + Expo | 🔜 Phase 2 |

### Languages (Phase 1 — ALL THREE from day one)

| Locale | Code | Direction | Role |
|---|---|---|---|
| Icelandic | `is` | LTR | **Default** |
| English | `en` | LTR | Secondary |
| Arabic | `ar` | **RTL** | Secondary |

### Currencies

| Currency | Code | Role |
|---|---|---|
| Icelandic Króna | ISK | **Default** + internal accounting |
| Euro | EUR | Selectable |
| US Dollar | USD | Selectable |

### Preset Trips (Landing Page)

Three one-tap cards:
1. **Flugvöllur → Reykjavík** (KEF → city)
2. **Reykjavík → Flugvöllur** (city → KEF)
3. **Flugvöllur → Bláa Lónið** (KEF → Blue Lagoon)

### User Roles (RBAC)

1. **Super Admin** — full access
2. **Dispatcher** — live map, dispatch, bookings
3. **Driver** — assigned jobs, earnings
4. **Passenger** — own bookings, payment methods

---

## 📦 TECH STACK (LOCKED)

### Frontend
| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 15 (App Router) | TypeScript strict |
| Styling | Tailwind CSS v4 | CSS-only config, no `tailwind.config.ts` |
| Components | Shadcn UI + Acernity UI | Radix primitives (RTL-aware via DirectionProvider) |
| State (client) | Zustand | UI state, preferences |
| State (server) | TanStack Query | ALL API data |
| Forms | React Hook Form + Zod | Zod v4 |
| Icons | lucide-react | ONLY icon library |
| Maps | Google Maps JS API | Address autocomplete, routing |
| i18n | `next-intl` | Next.js-native, RTL-aware |
| WebSocket client | `partysocket` | Auto-reconnect wrapper |

### Backend (Hono)
| Layer | Technology | Notes |
|---|---|---|
| Runtime | Node.js 20+ | |
| Framework | **Hono** | Standalone, NOT inside Next.js API routes |
| Validation | Zod + `@hono/zod-validator` | |
| ORM | Prisma | PostgreSQL |
| Auth | Better Auth | Works with Hono + Prisma |
| Realtime | Native WebSockets (`hono/ws`) + Redis pub/sub | NOT Socket.io |
| Jobs/Queue | BullMQ + Redis | Dispatch, webhooks, payouts, exchange rates |
| Payments | Stripe (manual capture, multi-currency) | |
| Storage SDK | `@aws-sdk/client-s3` | For DigitalOcean Spaces |

### Infrastructure
| Component | Provider |
|---|---|
| All apps + API | Railway |
| PostgreSQL | Railway Managed |
| Redis | Railway Managed |
| File Storage | DigitalOcean Spaces (Frankfurt — `fra1`) |
| CDN | DigitalOcean Spaces CDN |
| Monorepo Tool | Turborepo + pnpm |

### ❌ NEVER install

- **MongoDB / Mongoose** — PostgreSQL + Prisma only
- **Express** — we use Hono
- **Socket.io** — native WebSockets only
- **Supabase clients** — Better Auth + Prisma directly
- **Fastify** — Hono only
- **Redux, MobX, Recoil, Jotai** — Zustand for client state
- **Styled-components, Emotion, CSS Modules** — Tailwind v4 only
- **Moment.js** — use `date-fns` (with Icelandic locale `is`)
- **MUI, Ant Design, Chakra** — Shadcn only
- **Axios in the API** — native `fetch` or Hono client
- **jQuery** — ever

---

## 🗂️ MONOREPO STRUCTURE

```
hitch/
├── apps/
│   ├── passenger/              # Next.js — Public booking web (trilingual)
│   ├── dashboard/              # Next.js — Admin panel (trilingual)
│   └── api/                    # Hono — Backend API + WebSocket server
│
├── packages/
│   ├── ui/                     # Shared Shadcn components (RTL-aware)
│   ├── types/                  # Shared TypeScript types
│   ├── api-client/             # Shared TanStack Query hooks + WS client
│   ├── db/                     # Prisma schema + client
│   ├── auth/                   # Better Auth config
│   ├── i18n/                   # Shared translation keys & formatters
│   └── utils/                  # Geo, format, dates, currency helpers
│
├── package.json
├── turbo.json
├── pnpm-workspace.yaml
└── .env.example
```

### Package Manager: pnpm (NOT npm or yarn)

```bash
pnpm install
pnpm dev                          # All apps via Turborepo
pnpm --filter passenger dev
pnpm --filter api dev
```

---

## 🌍 INTERNATIONALIZATION (i18n)

**This is a trilingual Phase 1 app from day one.** Icelandic default, English secondary, Arabic with full RTL.

### Setup — `next-intl`

```ts
// apps/passenger/src/i18n/routing.ts
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['is', 'en', 'ar'],
  defaultLocale: 'is',
  localePrefix: 'always',  // /is/..., /en/..., /ar/...
});
```

### Translation Files

```
messages/
├── is.json     # Icelandic (source of truth)
├── en.json     # English
└── ar.json     # Arabic
```

Keys are grouped by feature/page: `landing.hero.title`, `booking.confirm.cta`, etc.

### Rules

- **NEVER** hardcode user-facing strings — every visible text goes through `t()`
- **NEVER** concatenate translated strings — use ICU message syntax (plurals, placeholders)
- **Icelandic is source of truth** — when adding new strings, write Icelandic first, then translate
- Developer comments stay in English (code, commits, internal docs)

### Language Switcher

Available in the header of every page (passenger + dashboard):
- Shows current language with flag/code
- On change: updates URL segment, saves preference to user profile (if logged in) or cookie
- RTL switch must feel instant — pre-load both direction stylesheets

### Date/Time

Use `date-fns` with locale imports:

```ts
import { format } from 'date-fns';
import { is, enGB, arSA } from 'date-fns/locale';

const locales = { is, en: enGB, ar: arSA };

format(new Date(), 'dd.MM.yyyy HH:mm', { locale: locales[currentLocale] });
```

Icelandic convention: `dd.MM.yyyy`, 24-hour time.

---

## 🔤 RTL (Arabic Layout) — Mandatory

Arabic is **not an afterthought**. It's a first-class locale tested on every component.

### Setup

**Root layout** wraps the app in Radix `DirectionProvider`:

```tsx
// apps/passenger/src/app/[locale]/layout.tsx
import { DirectionProvider } from '@radix-ui/react-direction';

export default function LocaleLayout({ children, params: { locale } }) {
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  return (
    <html lang={locale} dir={dir}>
      <body>
        <DirectionProvider dir={dir}>{children}</DirectionProvider>
      </body>
    </html>
  );
}
```

### Hard rules

- **Logical properties ONLY** in all components:
  - `ms-*` / `me-*` (margin-start / margin-end) — NEVER `ml-*` / `mr-*`
  - `ps-*` / `pe-*` (padding-start / padding-end) — NEVER `pl-*` / `pr-*`
  - `start-*` / `end-*` (positioning) — NEVER `left-*` / `right-*`
  - `text-start` / `text-end` — NEVER `text-left` / `text-right`
  - `border-s` / `border-e` — NEVER `border-l` / `border-r`
  - `rounded-s-*` / `rounded-e-*` — NEVER `rounded-l-*` / `rounded-r-*`

- **NEVER** use `flex-row-reverse` — plain `flex` already reverses visual order in RTL
- **NEVER** hardcode `dir="ltr"` on elements (use utility classes if needed for LTR-only content like phone numbers)
- **Icons**: Use plain `flex gap-2`, don't force order — the DOM order determines visual order in each direction
- **Carets and chevrons**: use CSS variable like `--rotation: 0` in LTR, `--rotation: 180deg` in RTL, OR use logical icons that don't have direction (e.g., `chevron-down` instead of `chevron-right`)

### LTR-only content in RTL layouts

Some content stays LTR regardless of layout direction: phone numbers, email addresses, URLs, booking IDs, flight numbers.

Use a utility class:

```css
.text-ltr {
  direction: ltr;
  unicode-bidi: embed;
  text-align: start;
}
```

```tsx
<span className="text-ltr">+354 555 1234</span>
<span className="text-ltr font-mono">HTCH-7K9P-XX42</span>
```

### RTL audit checklist (per component)

- [ ] No `ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`, `text-right`?
- [ ] No `flex-row-reverse`?
- [ ] Renders correctly in Arabic (switch and visually check)?
- [ ] Icons on the correct side?
- [ ] Form field labels align correctly?
- [ ] Modal/dropdown positioning flips correctly?

---

## 💰 CURRENCY & NUMBER FORMATTING

### Core rule: ISK is the source of truth

- **All prices stored in ISK** (`basePriceISK`, `amountISK`, `grossAmountISK`)
- **Display currency** is derived at quote/display time using the locked exchange rate
- **Once a booking is created**, the exchange rate is locked — customer sees the same price forever

### Number & Currency Formatting

```ts
// packages/utils/src/format.ts

export function formatCurrency(
  amountInCurrency: number,
  currency: 'ISK' | 'EUR' | 'USD',
  locale: 'is' | 'en' | 'ar'
): string {
  const localeMap = { is: 'is-IS', en: 'en-IS', ar: 'ar' };
  return new Intl.NumberFormat(localeMap[locale], {
    style: 'currency',
    currency,
    numberingSystem: 'latn',  // Western digits ALWAYS — even in Arabic
    maximumFractionDigits: currency === 'ISK' ? 0 : 2,
  }).format(amountInCurrency);
}

export function formatNumber(num: number, locale: 'is' | 'en' | 'ar'): string {
  const localeMap = { is: 'is-IS', en: 'en-IS', ar: 'ar' };
  return new Intl.NumberFormat(localeMap[locale], {
    numberingSystem: 'latn',
  }).format(num);
}
```

### Rules

- **ISK has no decimals** — display `12.500 kr.`, not `12.500,00 kr.`
- **EUR/USD have 2 decimals** — `€89,50` or `$92.00`
- **Arabic always uses Western digits** — `١٢٬٥٠٠` is FORBIDDEN, use `12,500`
- **Icelandic uses `.` for thousands, `,` for decimals** — `12.500,50`
- **Format on display only** — never store formatted strings in the DB

### Currency toggle behavior

- User can toggle between ISK / EUR / USD on quote page and in settings
- Toggle preference saved to user profile (or cookie for guests)
- When toggled, prices re-render using the current locked exchange rate (same booking, different display)

### Exchange Rate Worker

- BullMQ cron job runs **daily at 06:00 UTC**
- Fetches from `exchangerate.host` or similar free API
- Stores in `ExchangeRate` table
- Quote calculations use the most recent rate
- Bookings lock the rate at creation time

---

## ⚙️ CONFIGURATION

### Tailwind v4 — CSS-only

Configured via `@import "tailwindcss"` + `@theme inline { ... }` in `globals.css`. Extend via `@theme inline`, `@utility`, `@custom-variant`. **NO** `tailwind.config.ts`.

### TypeScript — Strict

`strict: true`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`. No `enum` — use `as const`.

### Environment Variables

```
# API
DATABASE_URL
REDIS_URL
BETTER_AUTH_SECRET
BETTER_AUTH_URL

# Stripe
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PUBLISHABLE_KEY          # exposed as NEXT_PUBLIC_

# DigitalOcean Spaces
DO_SPACES_ENDPOINT
DO_SPACES_REGION=fra1
DO_SPACES_BUCKET
DO_SPACES_KEY
DO_SPACES_SECRET
DO_SPACES_CDN_URL

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_KEY
GOOGLE_MAPS_SERVER_KEY

# WebSocket
NEXT_PUBLIC_WS_URL              # wss://api.hitch.is/ws in prod

# Exchange Rate API
EXCHANGE_RATE_API_KEY
```

---

## 🎨 VISUAL IDENTITY — Soft Pop Theme

### Colors (OKLCH — Light Mode)

```css
:root {
  --background: oklch(0.9789 0.0082 121.6272);
  --foreground: oklch(0 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0 0 0);
  --primary: oklch(0.5106 0.2301 276.9656);
  --primary-foreground: oklch(1 0 0);
  --secondary: oklch(0.7038 0.1230 182.5025);
  --secondary-foreground: oklch(0 0 0);
  --accent: oklch(0.7686 0.1647 70.0804);
  --accent-foreground: oklch(0 0 0);
  --destructive: oklch(0.6368 0.2078 25.3313);
  --destructive-foreground: oklch(1 0 0);
  --muted: oklch(0.95 0 0);
  --muted-foreground: oklch(0.45 0 0);
  --border: oklch(0.9 0 0);
  --input: oklch(0.9 0 0);
  --ring: oklch(0.7853 0.1041 274.7134);
  --radius: 1rem;  /* Soft Pop signature */
}
```

### Colors (OKLCH — Dark Mode)

```css
.dark {
  --background: oklch(0 0 0);
  --foreground: oklch(1 0 0);
  --card: oklch(0.2455 0.0217 257.2823);
  --card-foreground: oklch(1 0 0);
  --primary: oklch(0.6801 0.1583 276.9349);
  --primary-foreground: oklch(1 0 0);
  /* ... */
}
```

### Typography

| Locale | Font | Weights | Loaded Via |
|---|---|---|---|
| Icelandic (is) | **DM Sans** | 400, 500, 600, 700 | `next/font/google` |
| English (en) | **DM Sans** | 400, 500, 600, 700 | `next/font/google` |
| Arabic (ar) | **Cairo** | 400, 500, 600, 700 | `next/font/google` |
| All (mono) | **Space Mono** | 400, 700 | `next/font/google` |

DM Sans supports all Icelandic glyphs: ð, þ, æ, ö, á, í, ó, ú, ý. Verified.

**Setup:**

```tsx
// apps/passenger/src/app/layout.tsx
import { DM_Sans, Cairo, Space_Mono } from 'next/font/google';

const dmSans = DM_Sans({ subsets: ['latin', 'latin-ext'], variable: '--font-sans' });
const cairo = Cairo({ subsets: ['arabic'], variable: '--font-sans-ar' });
const spaceMono = Space_Mono({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-mono' });
```

**CSS:**

```css
:root {
  --font-sans-active: var(--font-sans);
}
[lang="ar"] {
  --font-sans-active: var(--font-sans-ar);
}
body {
  font-family: var(--font-sans-active), system-ui, sans-serif;
}
```

### Font-family rules

- **Functional UI** (body text, forms, buttons, labels, navigation): NEVER hardcode — use CSS variable so locale switching works
- **Display typography** (hero headings, marketing, editorial): custom fonts ALLOWED for creative direction. Ensure Arabic equivalent exists if the section shows in RTL.
- **Monospace data** (booking IDs, receipts, GPS coords): always Space Mono

### UI Geometry

- **Border radius**: `1rem` (16px) — Soft Pop signature
- **Shadows**: low opacity (`0.05`) with dark base `#1a1a1a`
- **Borders**: thin, subtle

---

## 🎨 Color System Rules

### Required tokens (functional UI — STRICT)

CSS variable tokens for:
- Body text, button fills, input fields, borders
- Hover/focus/active states
- Form validation (error, success)
- Navigation chrome (sidebar, header, tabs)

### Creative freedom (decorative/illustrative — ALLOWED)

Hardcoded colors + custom gradients ALLOWED for:

- **Landing page hero** — atmospheric gradients (think Iceland: auroras, volcanic blues, glacier whites)
- **Trip success moments** — celebration treatments
- **Empty states** — illustrated, colorful, memorable
- **Onboarding flows** — each step can have its own mood
- **Marketing/promotional sections**
- **Map overlays and route visualizations** — can use custom colors beyond tokens
- **Error pages (404, 500)** — these deserve personality
- **Decorative illustrations and SVG art** — any color

```tsx
// ✅ Iceland-inspired landing hero
<section className="bg-[linear-gradient(135deg,_#1E40AF_0%,_#7C3AED_50%,_#EC4899_100%)]">

// ✅ Empty state with personality
<EmptyState className="bg-gradient-to-br from-blue-50 to-purple-50">
  <TravelIllustration fill="#60A5FA" accent="#A78BFA" />
</EmptyState>
```

### Rule of thumb

- Color defines **component state** → **token**
- Color defines **atmosphere/mood/illustration** → **freedom**

---

## 🎬 Animation Philosophy

Animation is **intent-driven, not millisecond-capped.** Ask "does this communicate something?" before asking "how long?"

### Good candidates

- Booking flow transitions (search → quote → confirm)
- "Finding your driver" state with subtle pulsing
- Driver accepted → success burst
- Live map marker movements (smooth interpolation, not jumpy)
- Price changes on quote recalculation (number roll-up)
- Currency switch (brief cross-fade as numbers update)
- Skeleton → content reveal
- Landing page staged entrance

### Timing guidance (not hard caps)

- Micro-interactions: ~100-250ms
- Standard transitions: ~200-400ms
- Layout changes: ~300-500ms
- Orchestrated reveals: up to 1.5s with staggered children
- Celebration moments: up to 2s

### Signature moments to build

- **Landing page entrance** — hero text + search widget staged reveal
- **"See prices" tap** — elegant transition to quote results
- **Booking confirmation** — satisfying success state
- **Driver accepted** — smooth "searching" → "on the way" transition
- **Trip complete** — summary card with subtle celebration

### Hard rules (the only real limits)

- **`prefers-reduced-motion`**: ALWAYS respect
- **NEVER** animate on print
- **NEVER** use animations that block interaction
- **NEVER** animate during typing — keystroke latency under 50ms
- **Skeleton loaders** > spinners for waits over 300ms
- **Map markers**: interpolate smoothly, don't jump

---

## 🔤 ADDITIONAL FORMATTING RULES

### Phone Numbers

- Default country: `+354` (Iceland)
- Validate with `libphonenumber-js`
- Display with spaces: `+354 555 1234`
- Wrap in `.text-ltr` utility for Arabic layouts

### Booking IDs

- Format: `HTCH-XXXX-XXXX` (generated server-side)
- Display in Space Mono font
- Wrap in `.text-ltr` utility for Arabic layouts
- Copy-to-clipboard button on every display

### Dates

- Icelandic/English: `dd.MM.yyyy`
- Arabic: `dd/MM/yyyy`
- Times: 24-hour everywhere (`14:30`, not `2:30 PM`)
- Store UTC in DB, display in passenger's local timezone

---

## 🔑 DATA & STATE MANAGEMENT

### Server state → TanStack Query
ALL API data. Never store API responses in Zustand.

### Client state → Zustand
Theme, language, currency preference, sidebar state, form drafts.

### Local component state → useState
Anything not shared.

### TanStack Query stale times

| Data | staleTime | gcTime |
|---|---|---|
| User session | 10min | 20min |
| Pricing zones | 5min | 10min |
| Exchange rates | 1h | 2h |
| Booking history | 2min | 5min |
| Active booking status | 30s (or Realtime) | 2min |
| Driver location | Realtime via WebSocket — no TanStack Query |

---

## 🌐 REALTIME ARCHITECTURE

### Connection Flow

```
Client → WSS /ws (Hono)
  ↓ Better Auth validates session
  ↓ Client sends { action: "subscribe", channel: "booking:abc123" }
  ↓ Server validates RBAC
  ↓ Socket added to channel map
  ↓ Server subscribes to Redis channel
```

### Channels

| Channel | Who can subscribe |
|---|---|
| `booking:{bookingId}` | Passenger + Driver + Dispatcher for that booking |
| `driver:{driverId}:jobs` | That driver only |
| `dispatch:global` | Dispatchers + Super Admins |
| `driver-locations` | Dispatchers + Super Admins |
| `user:{userId}:notifications` | That user only |

### Driver Location

- Send every 3-5s via WebSocket
- Write to Redis (hot cache, 1min TTL)
- Throttled write to Postgres `DriverLocation` every 15-30s
- Active trips → `TripLocationHistory` every 10s
- NEVER write every second to Postgres

### Client Reconnection

Use `partysocket`:

```ts
import { PartySocket } from 'partysocket';

const socket = new PartySocket({
  host: process.env.NEXT_PUBLIC_WS_URL,
  room: `booking-${bookingId}`,
});
```

---

## 💳 PAYMENTS — STRIPE (Critical)

### 1. Manual Capture Flow

```
Booking DRAFT → PENDING_PAYMENT
  ↓ Stripe PaymentIntent with capture_method: 'manual'
  ↓ Customer authorizes → requires_capture
  ↓ Booking → CONFIRMED
  ↓ BullMQ dispatch runs
  ↓ Driver accepts → CAPTURE payment → ACCEPTED
  ↓ No driver in X min → VOID auth → CANCELLED_BY_SYSTEM
```

**NEVER** charge customer before driver confirmed.

### 2. Multi-Currency Handling

- PaymentIntent created in customer's display currency
- **Always store `amountISK` in Payment row** for accounting consistency
- Exchange rate locked at booking creation time
- Stripe handles the actual currency conversion fees

### 3. Idempotency

- Every mutation endpoint requires `Idempotency-Key` header
- Every Stripe API call uses `idempotencyKey` option
- Stripe webhooks: check `event.id` in `webhook_events` table

### 4. Webhook Outbox Pattern

```
Stripe webhook arrives
  ↓ Hono writes to webhook_events (status: pending)
  ↓ Returns 200 immediately
  ↓ BullMQ worker processes async
  ↓ On success → processed
  ↓ On failure → retry with backoff
```

**NEVER** process webhooks inline.

### 5. State Machine

```
DRAFT → PENDING_PAYMENT → CONFIRMED → SEARCHING → ACCEPTED
  → DRIVER_ARRIVING → DRIVER_ARRIVED → IN_TRANSIT → COMPLETED

Any → CANCELLED_* | DRIVER_ARRIVED → NO_SHOW
```

Every transition writes a `BookingEvent`.

---

## 📁 FILE STORAGE — DigitalOcean Spaces

### Presigned Upload Pattern

```
Client requests presigned URL → Hono
Hono generates 5-min PUT URL → returns to client
Client uploads DIRECTLY to Spaces
Client sends public URL to API for DB save
```

Files NEVER pass through the API server.

### Bucket structure

```
hitch-production/
├── drivers/{driverId}/
│   ├── documents/   (private, signed URLs, 5min TTL)
│   └── avatar.jpg   (public)
├── vehicles/{vehicleId}/photos/   (public)
├── passengers/{userId}/avatar.jpg (public)
└── receipts/{bookingId}.pdf       (private, signed URLs)
```

**Driver documents are always private.** Signed URLs with short TTL only.

---

## 🔐 SECURITY

### Authentication
- Better Auth sessions via secure cookies (web)
- JWT tokens for mobile (Phase 2)
- Session: 7 days rolling, 30 days absolute max

### Authorization
- RBAC in Hono middleware on every protected route
- Dashboard: role ∈ `[SUPER_ADMIN, DISPATCHER]`
- Driver routes: role = `DRIVER` AND `driverId` matches session
- Passenger routes: role = `PASSENGER` AND ownership check

### PII & Compliance
- Payment data tokenized via Stripe — never stored
- Live location: only assigned driver ↔ passenger during active trip
- Dispatcher location access: logged to audit table
- Driver docs: encrypted at rest, private only
- GDPR compliance required (EU market)

### Input Validation
- Every Hono route uses `zValidator`
- Schemas in `packages/types/schemas/` — shared FE/BE
- NEVER trust client data

---

## 🧩 COMPONENT PATTERNS

### Component structure

```tsx
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import type { SearchParams } from '@hitch/types';

interface Props {
  onSubmit: (params: SearchParams) => void;
}

export function SearchWidget({ onSubmit }: Props) {
  const t = useTranslations('search');
  return (
    <div className="rounded-2xl border bg-card p-6">
      <h2 className="text-start">{t('title')}</h2>
      {/* Logical properties, translated strings */}
    </div>
  );
}
```

Rules:
- Named exports, one per file
- Guideline (not hard cap): under ~200 lines
- `import type` mandatory
- No `any`
- Every user-facing string goes through `t()`
- Logical properties only (`text-start`, `ms-*`, `me-*`)

### Forms

- Zod v4 + React Hook Form + `zodResolver`
- Defaults for all fields
- Disable submit during `isPending`
- Error messages localized through `t()`

### Error states

Every data-fetching component handles:
- **Loading** → Skeleton
- **Error** → retry + localized message
- **Empty** → illustration + CTA + localized text

### Hooks Before Early Returns

ALL hooks BEFORE any early return. React requires stable hook order.

```tsx
// ❌ WRONG
if (isLoading) return <Spinner />;
const items = useMemo(() => ..., [data]);  // CRASH

// ✅ RIGHT
const items = useMemo(() => data ? [...] : [], [data]);
if (isLoading) return <Spinner />;
```

---

## 🗄️ DATABASE RULES

### Prisma
- Schema in `packages/db/prisma/schema.prisma`
- Generate: `pnpm --filter db generate`
- Migrations: `pnpm --filter db migrate:dev` (dev) / `migrate:deploy` (prod)
- NEVER `prisma db push` against production

### Critical indexes

See `HITCH_MASTER_PLAN.md` section 8. Key ones:

```prisma
@@index([driverId, status])
@@index([passengerId, createdAt])
@@index([status, scheduledTime])
```

### Transactions

Use `prisma.$transaction` for:
- Booking + Payment + BookingEvent creation
- Driver payout generation
- Any multi-table financial operation

### Booking Events (Audit Trail)

**Every** status change writes a `BookingEvent`. No exceptions.

---

## 🚀 DISPATCH LOGIC

1. Dispatch runs in BullMQ, NEVER inline
2. Dispatch job is idempotent
3. State machine enforces transitions
4. Every decision logged to BookingEvent

### Flow

```
Booking CONFIRMED
  → dispatch worker picks up job
  → Find drivers within radius (PostGIS)
  → Score by distance + rating + idle time
  → Offer to top driver (publish to driver:{id}:jobs)
  → Wait for accept (30s timeout)
  → If accepted → ACCEPTED, capture Stripe
  → If rejected/timeout → next driver
  → After N failures → escalate to dispatcher
```

---

## 🌍 MAPS & GEO

### Google Maps
- `@googlemaps/react-wrapper` on the frontend
- Different API keys for different contexts, restricted by referrer/IP
- Autocomplete via Places API — **bias to Iceland** (country: `is`)
- Routing via Directions API — cache aggressively
- Map center: `64.1466, -21.9426` (Reykjavík) for dashboard default

### Geo Storage
- `Float lat, Float lng` for simple locations
- `Json` for zone polygons (GeoJSON)
- Add PostGIS extension if queries get slow

### Live Map Rendering
- Throttle marker re-renders to ~10fps
- Marker clustering when >50 markers visible
- Smooth marker interpolation between WebSocket updates

---

## 📱 RESPONSIVE STRATEGY

### Mobile-first

```tsx
<div className="flex flex-col gap-4 md:flex-row md:gap-6 lg:gap-8">
```

### Passenger web priorities
- **Mobile is primary** — tourists book from their phone at KEF
- Landing page great at 375px width
- Search widget one-handed usable
- Confirmation page works with poor airport wifi

### Dashboard priorities
- **Desktop-primary**, tablet-usable
- Live map clean on 10"+ tablets
- Tables: card view on mobile, full on desktop

---

## ♿ ACCESSIBILITY

- Keyboard navigation for all interactive elements
- 44px minimum touch targets
- Labels on all form fields
- `alt` on all images (`alt=""` for decorative)
- 4.5:1 contrast minimum
- Visible focus rings (use `--ring` token)
- Semantic HTML
- `aria-live` for booking status updates
- Skip-to-content link on landing page
- RTL reading order preserved for screen readers

---

## 📝 TYPESCRIPT RULES

- No `any`
- No `enum` → use `as const` or string literal unions
- `import type` mandatory
- Prisma types auto-generated — use them, don't duplicate

```ts
import type { Booking, BookingStatus } from '@hitch/types';
import { bookingSchema } from '@hitch/types/schemas';
```

---

## 🚫 No Inline Hardcoded Values

Any value in MORE THAN ONE FILE must be centralized.

### Must centralize
- **API paths** → `packages/api-client/routes.ts`
- **Role strings** → `packages/types/constants.ts`
- **Booking statuses** → same constants file
- **Locale codes** → `packages/i18n/locales.ts` (`is`, `en`, `ar`)
- **Currency codes** → `packages/i18n/currencies.ts`
- **Layout dimensions** → CSS variables
- **Z-index values** → CSS variables
- **Breakpoints** → Tailwind responsive prefixes

### Acceptable inline
- Tailwind utility classes
- One-off values in a single component
- **Decorative colors in hero/empty/marketing** (see Color System Rules)

---

## ✅ PRE-CODE CHECKLIST

- [ ] Read relevant section of `HITCH_MASTER_PLAN.md`?
- [ ] Every user-facing string uses `t()`?
- [ ] Logical properties (`ms-`, `me-`, `text-start`)? No `ml-`, `mr-`, `left-`, `right-`?
- [ ] No `flex-row-reverse`?
- [ ] RTL tested (switch to `ar` and check)?
- [ ] Icelandic chars render (ð, þ, æ, ö, á, í, ó, ú, ý)?
- [ ] ISK is the source of truth? Display currency derived?
- [ ] Western digits only (even in Arabic)?
- [ ] Using Prisma types directly (not duplicating)?
- [ ] API call through TanStack Query or Hono client (not raw fetch)?
- [ ] Mutation has `Idempotency-Key`?
- [ ] Payment-touching code uses manual capture?
- [ ] State transition goes through state machine?
- [ ] BookingEvent logged for status changes?
- [ ] Input validated with Zod schema (shared FE/BE)?
- [ ] RBAC check on the route?
- [ ] Functional UI uses tokens; decorative sections have freedom?
- [ ] Component handles loading/error/empty states?
- [ ] Hooks before early returns?
- [ ] No `any`, no `enum`, `import type` for types?
- [ ] Accessibility: keyboard, labels, contrast?
- [ ] Mobile-first responsive?

---

## 📤 PRE-COMMIT CHECKLIST

- [ ] `pnpm build` — zero errors
- [ ] `pnpm lint` — zero warnings
- [ ] `pnpm test` — all passing
- [ ] No `console.log`, no `any`, no hardcoded secrets
- [ ] New strings added to all 3 locales (is/en/ar)
- [ ] Environment variables in `.env.example`
- [ ] Prisma migration created (if schema changed)
- [ ] New Shadcn components styled per Soft Pop theme
- [ ] RTL-audited (switch to Arabic, visually verify)
- [ ] Loading / error / empty states present
- [ ] Works: mobile + desktop + dark mode + RTL
- [ ] WebSocket subscriptions clean up on unmount
- [ ] Sensitive actions logged to BookingEvent or audit table
- [ ] Commit: `type(scope): description`

---

## 🖥️ COMMANDS

```bash
# Monorepo
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm test

# Individual apps
pnpm --filter passenger dev
pnpm --filter dashboard dev
pnpm --filter api dev

# Database
pnpm --filter db generate
pnpm --filter db migrate:dev
pnpm --filter db migrate:deploy
pnpm --filter db studio

# Shadcn (per app)
cd apps/passenger && pnpm dlx shadcn@latest add button
```

---

## 🔑 GOLDEN RULES

1. **Stack is locked**: Next.js + Hono + PostgreSQL + Prisma + Better Auth + Native WebSockets + BullMQ + Railway + DO Spaces. Don't substitute.
2. **Icelandic-first, trilingual from day one**: is (default) + en + ar with full RTL
3. **RTL is first-class**: Arabic tested on every component, logical properties only
4. **ISK is the source of truth**: all internal pricing in ISK, display currency derived
5. **Western digits always**: even in Arabic UI, never Arabic-Indic digits
6. **Payment safety > everything**: Manual capture, idempotency, state machine, webhook outbox
7. **Server state ≠ Client state**: TanStack Query for API data, Zustand for UI state
8. **Type everything**: No `any`, shared types between apps, `import type` for types
9. **Tokens for functional UI, freedom for decorative**: Hero sections can be bold, forms cannot
10. **Animation is intent-driven**: No millisecond caps, only `prefers-reduced-motion`
11. **Dispatch runs in BullMQ**: Never inline, never in Next.js routes
12. **Every state change logged**: BookingEvent is your insurance
13. **Presigned uploads only**: Files never pass through the API server
14. **RBAC on every route**: Frontend guard + backend validation, always
15. **Passenger is the customer**: Stressed, tired, at an airport — clarity over cleverness
16. **Test the money path**: Payment flow has zero margin for error
17. **Creative freedom is a feature**: Signature moments expected, not optional
18. **When uncertain about architecture**: Read `HITCH_MASTER_PLAN.md` — it's the source of truth
