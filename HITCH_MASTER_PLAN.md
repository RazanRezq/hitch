# HITCH — Master Project Plan
> Ride-booking platform for KEF ↔ Reykjavík airport transfers
> Last updated: April 2026

---

## 1. Project Overview

Hitch is a streamlined ride-booking platform built for **Iceland** — specifically the Keflavík Airport (KEF) ↔ Reykjavík transfer market. It prioritizes a frictionless passenger booking experience while providing robust tools for drivers and administrators.

**Core Principles:**
- One-tap booking as the primary UX goal
- Clean, minimalist "Soft Pop" design aesthetic
- Icelandic-first, trilingual (is/en/ar) from Phase 1
- Unified backend serving all four surfaces
- Vendor-independent, production-grade stack
- TypeScript end-to-end

**Target Market:**
- Primary: Tourists arriving at KEF needing transfers to Reykjavík hotels
- Secondary: Reykjavík residents going to KEF
- Tertiary: Tourists going directly from KEF → Blue Lagoon

---

## 2. Localization (Phase 1)

### Languages
| Locale | Code | Direction | Status |
|---|---|---|---|
| Icelandic | `is` | LTR | **Default** |
| English | `en` | LTR | Secondary |
| Arabic | `ar` | **RTL** | Secondary |

### Currency
| Currency | Code | Default? |
|---|---|---|
| Icelandic Króna | ISK | **Default** |
| Euro | EUR | Selectable |
| US Dollar | USD | Selectable |

Exchange rates fetched daily from a rate API (e.g. exchangerate.host). Always quote the customer in ISK internally; display in their selected currency.

### Formatting

**Icelandic (is-IS):**
- Thousands separator: `.` (12.500)
- Decimal separator: `,` (1.234,56)
- Currency: `12.500 kr.` (post-positioned)
- Date: `dd.MM.yyyy` (23.04.2026)
- Time: 24-hour (`14:30`)

**English (en-IS):** English language, Icelandic conventions where it makes sense (24h time, dd.MM.yyyy)

**Arabic (ar):**
- Western digits only (0-9), never Arabic-Indic (٠-٩)
- Use `numberingSystem: 'latn'` in all `Intl.NumberFormat` calls
- Currency shown as code (`12,500 ISK`) rather than symbol, for clarity
- Date format: `dd/MM/yyyy`
- RTL layout — logical properties only

### Phone Numbers
- Default country code: `+354` (Iceland)
- Support: `+354`, `+1`, `+44`, `+49`, regional MENA codes for Arabic users
- Use `libphonenumber-js` for validation

### Airport Codes
- `KEF` — Keflavík International (primary)
- Flight number validation: optional but encouraged for better ETA calculation

---

## 3. Platform Surfaces

| Surface | Platform | Audience | Priority |
|---|---|---|---|
| Passenger Web | Next.js (Browser) | Passengers | ✅ Phase 1 |
| Management Dashboard | Next.js (Browser) | Admins / Dispatchers | ✅ Phase 1 |
| Passenger App | React Native + Expo | Passengers | 🔜 Phase 2 |
| Driver App | React Native + Expo | Drivers | 🔜 Phase 2 |

### Surface Responsibilities

**Passenger Web (Next.js)**
- Landing page + search widget (trilingual from day one)
- Preset trip cards: KEF → Reykjavík, Reykjavík → KEF, optionally KEF → Blue Lagoon
- Quote / pricing results (ISK default, EUR/USD toggle)
- Booking confirmation + payment
- Booking history (account page)
- Confirmation emails / receipts

**Management Dashboard (Next.js)**
- Live dispatch map (centered on Reykjavík/KEF corridor)
- Bookings management + driver assignment
- Driver & fleet management
- Pricing zones + fare configuration (zones cover KEF, Reykjavík, Greater Reykjavík, Blue Lagoon)
- Payments, refunds, payouts (in ISK, Stripe handles conversion for non-ISK bookings)
- Revenue & performance reports

**Passenger App (React Native — Phase 2)**
- Quick rebooking
- Live driver GPS tracking
- Push notifications
- Rate the driver
- Payment methods management

**Driver App (React Native — Phase 2)**
- Incoming job requests (distance, payout, passenger count)
- Accept → navigate flow
- Daily / weekly earnings (in ISK)

---

## 4. Preset Trips (Landing Page)

Three one-tap cards on the landing page:

| Card | From | To | Est. Distance | Est. Duration |
|---|---|---|---|---|
| **Flugvöllur → Reykjavík** | Keflavík Airport (KEF) | Reykjavík (city center) | ~50 km | 45-50 min |
| **Reykjavík → Flugvöllur** | Reykjavík (pickup address) | Keflavík Airport (KEF) | ~50 km | 45-50 min |
| **Flugvöllur → Bláa Lónið** | Keflavík Airport (KEF) | Blue Lagoon | ~25 km | 20 min |

**Labels by locale:**
- `is`: "Flugvöllur → Reykjavík"
- `en`: "Airport → Reykjavík"
- `ar`: "المطار → ريكيافيك"

---

## 5. Final Tech Stack

### Frontend (Phase 1)
| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Components | Shadcn UI + Acernity UI |
| State | Zustand |
| Data Fetching | TanStack Query |
| Forms | React Hook Form + Zod |
| Maps | Google Maps JS API |
| i18n | `next-intl` (Next.js-native i18n) |
| WebSocket Client | `partysocket` |

### Backend (Hono Standalone)
| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ |
| Framework | Hono (TypeScript-first, standalone) |
| Validation | Zod + `@hono/zod-validator` |
| ORM | Prisma |
| Database | PostgreSQL (Railway managed) |
| Auth | Better Auth |
| Realtime | Native WebSockets via `hono/ws` + Redis pub/sub |
| Jobs/Queue | BullMQ + Redis (Railway managed) |
| Payments | Stripe (manual capture, multi-currency) |
| Storage SDK | `@aws-sdk/client-s3` (for DO Spaces) |

### Infrastructure
| Component | Provider |
|---|---|
| Next.js Passenger Web | Railway |
| Next.js Dashboard | Railway |
| Hono API | Railway |
| PostgreSQL | Railway Managed |
| Redis | Railway Managed |
| File Storage | DigitalOcean Spaces (S3-compatible) |
| CDN for Files | DigitalOcean Spaces CDN |
| Monorepo Tool | Turborepo + pnpm |

### Mobile (Phase 2)
| Layer | Technology |
|---|---|
| Framework | React Native + Expo |
| Navigation | Expo Router |
| Maps | react-native-maps (Google) |
| Push Notifications | Expo Notifications |
| Payments | Stripe React Native SDK |

---

## 6. Visual Identity — Soft Pop Theme

### Colors (OKLCH)
| Token | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| Background | `oklch(0.9789 0.0082 121.6272)` | `oklch(0 0 0)` | Page background |
| Foreground | `oklch(0 0 0)` | `oklch(1.0000 0 0)` | All text |
| Primary | `oklch(0.5106 0.2301 276.9656)` | `oklch(0.6801 0.1583 276.9349)` | CTAs, buttons |
| Secondary | `oklch(0.7038 0.1230 182.5025)` | — | Secondary actions |
| Accent | `oklch(0.7686 0.1647 70.0804)` | — | Alerts, highlights |
| Card (dark) | — | `oklch(0.2455 0.0217 257.2823)` | Cards in dark mode |
| Destructive | `oklch(0.6368 0.2078 25.3313)` | — | Cancel / delete |
| Ring | `oklch(0.7853 0.1041 274.7134)` | — | Input focus state |

### Typography

| Language | Font | Weights |
|---|---|---|
| Icelandic (is) | **DM Sans** | 400, 500, 600, 700 |
| English (en) | **DM Sans** | 400, 500, 600, 700 |
| Arabic (ar) | **Cairo** | 400, 500, 600, 700 |
| Monospace (all) | **Space Mono** | 400, 700 |

DM Sans supports all Icelandic glyphs (ð, þ, æ, ö, á, í, ó, ú, ý) — verified.

**Usage:**
- DM Sans / Cairo: all functional UI — body text, headings, buttons, forms
- Space Mono: technical/tabular data — booking IDs, receipt numbers, GPS coords, fare breakdowns

Load via `next/font/google` in the root layout.

### UI Geometry
- **Border Radius:** `1rem` (16px) on cards, buttons, dialogs, widgets — Soft Pop signature
- **Shadows:** Very low opacity (`0.05`) with dark base `#1a1a1a`
- **Borders:** Thin, subtle

---

## 7. User Roles (RBAC)

| Role | Access |
|---|---|
| Super Admin | Full access — business settings, financials, platform config |
| Dispatcher | Live map, manual dispatch, active booking edits |
| Driver | Assigned jobs, personal earnings, navigation |
| Passenger | Personal bookings, payment methods, live trip tracking |

Authorization enforced in Hono API via Better Auth session + role middleware.

---

## 8. Data Model (Expanded for Production)

### Core Entities

**User**
```
id, email, phone, role, name, avatarUrl,
stripeCustomerId, stripeConnectAccountId,
phoneVerifiedAt, emailVerifiedAt,
preferredLocale (is|en|ar), preferredCurrency (ISK|EUR|USD),
createdAt, updatedAt
```

**Vehicle**
```
id, driverId, vehicleType (SEDAN|SUV|VAN),
capacity, licensePlate, make, model, year, color,
photos[], isActive
```

**Booking**
```
id, passengerId, driverId, vehicleId,
pickupLocation (geo), dropoffLocation (geo),
pickupAirportCode, flightNumber,
scheduledTime, estimatedPickupAt, actualPickupAt, actualDropoffAt,
estimatedDistanceKm, actualDistanceKm,
vehicleTypeRequested, passengerCount,
basePriceISK (always in ISK),
displayCurrency (ISK|EUR|USD),
displayPrice (amount in displayCurrency at exchange rate at booking time),
exchangeRate,
cancellationReason, cancellationFee,
status, createdAt, updatedAt
```

**BookingStatus Enum**
```
DRAFT
PENDING_PAYMENT
CONFIRMED
SEARCHING
ACCEPTED
DRIVER_ARRIVING
DRIVER_ARRIVED
IN_TRANSIT
COMPLETED
CANCELLED_BY_PASSENGER
CANCELLED_BY_DRIVER
CANCELLED_BY_SYSTEM
NO_SHOW
DISPUTED
```

**BookingEvent** (audit trail)
```
id, bookingId, type, payload (JSON), actorId, createdAt
```

**Payment**
```
id, bookingId, stripeIntentId,
amount, currency (customer's currency — ISK, EUR, USD),
amountISK (always stored for accounting),
status, capturedAt, refundedAt, createdAt
```

**DriverPayout**
```
id, driverId, periodStart, periodEnd,
grossAmountISK, commissionAmountISK, netAmountISK,
stripeTransferId, status, bookingIds[]
```

**DriverLocation** (current only)
```
driverId, lat, lng, heading, isOnline, updatedAt
```

**TripLocationHistory** (active trips only, partitioned by date)
```
id, bookingId, lat, lng, timestamp
```

**DriverDocument**
```
id, driverId, type (LICENSE|INSURANCE|REGISTRATION|BACKGROUND_CHECK),
fileUrl, expiresAt, verifiedAt, verifiedBy
```

**Rating** (bidirectional)
```
id, bookingId, raterId, rateeId, score, comment, createdAt
```

**PricingZone**
```
id, name (localized: { is, en, ar }),
polygon (GeoJSON), baseFareISK, perKmRateISK,
airportSurchargeISK, isActive
```

**PromoCode**
```
id, code, discountType (PERCENT|FIXED), discountValueISK,
maxUses, usesCount, validFrom, validUntil, isActive
```

**PromoRedemption**
```
id, promoCodeId, bookingId, userId, discountAppliedISK, createdAt
```

**ExchangeRate**
```
id, fromCurrency (ISK), toCurrency (EUR|USD), rate, fetchedAt
```

### Critical Indexes
```
Booking: [driverId, status], [passengerId, createdAt],
         [status, scheduledTime], partial index on active statuses
DriverLocation: [isOnline] partial, GIST on (lat, lng)
TripLocationHistory: [bookingId, timestamp]
Payment: [bookingId], [stripeIntentId]
ExchangeRate: [toCurrency, fetchedAt]
```

### Security
- Payment data tokenized (Stripe) — no card data on Hitch DB
- Live location shared only between assigned driver ↔ passenger during active trip
- Driver documents stored private on DO Spaces with signed URLs
- All prices computed and stored in ISK; display-currency amounts are derived and cached

---

## 9. Pricing Zones (Iceland-Specific)

Initial zones covering the KEF ↔ Reykjavík corridor:

| Zone | Coverage | Notes |
|---|---|---|
| **Keflavík Airport** | KEF terminal + parking areas | Airport surcharge applies |
| **Keflavík Town** | Town of Keflavík | |
| **Reykjavík Center** | 101, 102, 105 postal codes | |
| **Greater Reykjavík** | Kópavogur, Hafnarfjörður, Garðabær, Mosfellsbær | |
| **Blue Lagoon (Bláa Lónið)** | Blue Lagoon + nearby hotels | Popular tourist stop |
| **Reykjanes Peninsula** | Grindavík, outer peninsula | For specific requests |
| **Golden Circle (future)** | Þingvellir, Geysir, Gullfoss | Tour packages |

Each zone has:
- `baseFareISK` (flat start fee)
- `perKmRateISK` (per-kilometer rate)
- `airportSurchargeISK` (added on KEF pickups/dropoffs)

---

## 10. The 7-Step Booking Workflow

| Step | Name | Description |
|---|---|---|
| 1 | Search | Passenger enters From/To, date/time, passenger count |
| 2 | Quote | System calculates route, displays car types + prices (in selected currency) |
| 3 | Confirmation | Passenger confirms, Stripe auth (manual capture), receipt |
| 4 | Dispatch | BullMQ job assigns driver (auto or manual) |
| 5 | Transit | Driver navigates, live GPS via native WebSockets |
| 6 | Completion | Stripe capture, passenger rates, final receipt |
| 7 | Logging | Analytics updated, BookingEvent audit trail complete |

### Critical Payment Safety Rules
- **Always use Stripe Payment Intents with manual capture**
- **Always compute/store price in ISK internally** — display currency is derived
- **Every mutation must be idempotent** (`Idempotency-Key` header)
- **Dispatch runs in BullMQ**, not inline — survives crashes
- **Webhook outbox pattern** — write webhooks to DB, process async
- **Strict state machine** — reject illegal transitions, log all attempts
- **Exchange rate locked at booking time** — no surprise price changes for customer

---

## 11. Project Structure (Monorepo)

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
│   ├── i18n/                   # Shared translation keys (is/en/ar)
│   └── utils/                  # Shared helpers (geo, format, dates, currency)
│
├── package.json                # pnpm workspaces root
├── turbo.json                  # Turborepo config
└── .env.example
```

### `apps/api/` Structure (Hono)
```
src/
├── index.ts                    # Hono bootstrap + server start
├── routes/
│   ├── auth.ts                 # Better Auth handler
│   ├── bookings.ts
│   ├── drivers.ts
│   ├── payments.ts
│   ├── uploads.ts              # Presigned URLs for DO Spaces
│   ├── exchange-rates.ts       # Current rates ISK → EUR/USD
│   └── webhooks/
│       └── stripe.ts
├── realtime/
│   ├── ws-server.ts
│   ├── channels.ts
│   ├── redis-pubsub.ts
│   └── handlers/
├── services/
│   ├── dispatch/
│   ├── pricing/
│   ├── payments/
│   ├── currency/               # Exchange rate fetcher + converter
│   └── storage/
├── workers/
│   ├── dispatch.worker.ts
│   ├── payout.worker.ts
│   ├── webhook.worker.ts
│   └── exchange-rate.worker.ts # Cron: fetch daily rates
├── middleware/
│   ├── auth.ts
│   ├── rbac.ts
│   ├── locale.ts               # Detect Accept-Language
│   └── idempotency.ts
└── lib/
    ├── redis.ts
    ├── prisma.ts
    └── stripe.ts
```

### `apps/passenger/` Structure
```
src/
├── app/
│   ├── [locale]/               # next-intl locale segment (is|en|ar)
│   │   ├── page.tsx            # Landing page
│   │   ├── search/page.tsx
│   │   ├── booking/
│   │   │   ├── confirm/page.tsx
│   │   │   └── [id]/page.tsx
│   │   └── account/
│   │       ├── trips/page.tsx
│   │       └── settings/page.tsx
│   └── layout.tsx              # Root layout with DirectionProvider
├── components/
│   ├── search/
│   │   ├── SearchWidget.tsx
│   │   ├── PresetCard.tsx      # KEF ↔ Reykjavík cards
│   │   └── DateTimePicker.tsx
│   ├── booking/
│   │   ├── CarTypeCard.tsx
│   │   ├── PriceSummary.tsx    # Handles ISK/EUR/USD display
│   │   ├── CurrencyToggle.tsx
│   │   └── PaymentForm.tsx
│   └── trip/
│       ├── LiveMap.tsx
│       └── TripStatusBar.tsx
├── i18n/
│   ├── request.ts              # next-intl config
│   └── routing.ts              # Locale routing config
└── messages/
    ├── is.json                 # Icelandic translations
    ├── en.json                 # English translations
    └── ar.json                 # Arabic translations
```

### `apps/dashboard/` Structure
```
src/app/
├── [locale]/
│   ├── overview/page.tsx       # Live dispatch map
│   ├── bookings/
│   ├── drivers/
│   ├── fleet/page.tsx
│   ├── pricing/page.tsx
│   ├── payments/page.tsx
│   └── reports/page.tsx
```

---

## 12. Route Map

| Route (with locale prefix) | App | Description |
|---|---|---|
| `/is` or `/en` or `/ar` | passenger | Landing page |
| `/{locale}/search` | passenger | Quote results |
| `/{locale}/booking/confirm` | passenger | Payment + confirmation |
| `/{locale}/booking/[id]` | passenger | Live trip tracking |
| `/{locale}/account/trips` | passenger | Booking history |
| `/{locale}/overview` | dashboard | Live dispatch map |
| `/{locale}/bookings` | dashboard | All bookings |
| `/{locale}/bookings/[id]` | dashboard | Booking detail |
| `/{locale}/drivers` | dashboard | Driver management |
| `/{locale}/fleet` | dashboard | Vehicle records |
| `/{locale}/pricing` | dashboard | Fare configuration |
| `/{locale}/payments` | dashboard | Transactions |
| `/{locale}/reports` | dashboard | Analytics |

### API Routes (Hono)
```
POST   /api/auth/*              # Better Auth
GET    /api/bookings
POST   /api/bookings
GET    /api/bookings/:id
PATCH  /api/bookings/:id
POST   /api/bookings/:id/assign
GET    /api/drivers
POST   /api/drivers
GET    /api/drivers/:id/documents
POST   /api/uploads/presigned
POST   /api/payments/intent
POST   /api/webhooks/stripe
GET    /api/exchange-rates      # Current ISK → EUR/USD
WS     /ws                      # WebSocket endpoint
```

---

## 13. Real-time Architecture (Native WebSockets + Redis)

### Connection Flow
```
Client (Next.js) connects to WSS /ws
  ↓
Hono upgrades connection via hono/ws
  ↓
Better Auth session validates user
  ↓
Client sends: { action: "subscribe", channel: "booking:abc123" }
  ↓
Server validates user has access to that channel (RBAC)
  ↓
Server adds socket to in-memory Map<channel, Set<WebSocket>>
  ↓
Server subscribes to Redis channel (once per channel)
```

### Channel Naming Convention
```
booking:{bookingId}          → Passenger + Driver + Dispatcher for that booking
driver:{driverId}:jobs       → Incoming job offers for a driver
dispatch:global              → All active bookings + drivers (dispatchers only)
driver-locations             → Driver GPS stream (dispatchers only)
user:{userId}:notifications  → Personal notifications
```

### Driver Location Strategy
- Driver app sends location every 3–5s via WebSocket
- Hono writes to Redis (hot cache, 1 min TTL)
- Throttled write to Postgres `DriverLocation` every 15–30s
- During active trips → snapshots to `TripLocationHistory` every 10s

---

## 14. File Storage — DigitalOcean Spaces

### Upload Pattern
```
Client requests presigned URL → Hono API
Hono generates presigned PUT URL → returns to client
Client uploads directly to Spaces
Client sends public URL to API for DB save
```

### Bucket Structure
```
hitch-production/
├── drivers/{driverId}/documents/   (private, signed URLs only)
├── drivers/{driverId}/avatar.jpg   (public)
├── vehicles/{vehicleId}/photos/    (public)
├── passengers/{userId}/avatar.jpg  (public)
└── receipts/{bookingId}.pdf        (private, signed URLs)
```

### Environment Variables Required
```
DO_SPACES_ENDPOINT=https://fra1.digitaloceanspaces.com
DO_SPACES_REGION=fra1
DO_SPACES_BUCKET=hitch-production
DO_SPACES_KEY=xxx
DO_SPACES_SECRET=xxx
DO_SPACES_CDN_URL=https://hitch-production.fra1.cdn.digitaloceanspaces.com
```

> Use Frankfurt (`fra1`) region — closest to Iceland for low latency.

---

## 15. Build Order (Phase 1)

### Sprint 1: Foundation (Week 1–2)
1. Monorepo scaffold (Turborepo + pnpm)
2. Prisma schema + migrations (Iceland-localized)
3. Better Auth setup (email/password + phone OTP)
4. Hono API skeleton + middleware
5. next-intl setup + initial translations (is/en/ar)
6. Railway deployment pipeline

### Sprint 2: Passenger Web Core (Week 3–4)
1. Landing page + SearchWidget + 3 preset cards (KEF ↔ Reykjavík ↔ Blue Lagoon)
2. Google Maps integration (Iceland-centered)
3. Quote/results page with currency toggle
4. Booking confirmation + Stripe integration (multi-currency)

### Sprint 3: Dashboard Core (Week 5–6)
1. Dashboard layout + auth
2. Bookings table + detail view
3. Driver management
4. Manual dispatch flow
5. Pricing zones (Iceland-specific) configuration

### Sprint 4: Real-time + Dispatch (Week 7–8)
1. WebSocket server (hono/ws) + Redis pub/sub
2. BullMQ dispatch worker
3. Live dispatch map (Reykjavík/KEF corridor)
4. Booking status flow end-to-end
5. Exchange rate worker (daily cron)

### Sprint 5: Polish (Week 9–10)
1. Promo codes
2. Reports & analytics
3. Email/SMS notifications (trilingual templates)
4. RTL audit for entire app
5. Testing + bug bash

---

## 16. Key Decisions Log

| Decision | Choice | Reason |
|---|---|---|
| Target market | Iceland (KEF ↔ Reykjavík) | Clear demand, underserved market |
| Default locale | Icelandic (is) | Primary market |
| Phase 1 languages | is, en, ar | Tourist diversity + founder's Arabic market knowledge |
| Default currency | ISK | Native market currency |
| Multi-currency | ISK/EUR/USD selectable | Tourist-friendly |
| Database | PostgreSQL | Relational, ACID for payments |
| Auth | Better Auth | Hono + Prisma compatible |
| ORM | Prisma | Best TypeScript DX |
| Backend framework | Hono | Modern, TS-first, runtime-agnostic |
| Realtime | Native WebSockets | Simpler, lighter than Socket.io |
| Realtime scaling | Redis pub/sub | Horizontal scaling |
| i18n | next-intl | Next.js 15 native, RTL-aware |
| File storage | DigitalOcean Spaces | S3-compatible, Frankfurt region (close to Iceland) |
| App hosting | Railway | Best DX, integrated Postgres/Redis |
| Payments | Stripe (manual capture) | Multi-currency, atomic safety |
| Queue | BullMQ + Redis | Persistent jobs for dispatch |
| Driver surface | React Native (Phase 2) | Background GPS + push notifications |
| Monorepo tool | Turborepo + pnpm | Shared types/components across apps |

---

## 17. Critical Safety Rules (Non-Negotiable)

1. **Stripe manual capture only** — authorize on booking, capture on driver accept
2. **ISK is the source of truth** — all internal pricing, storage, analytics in ISK
3. **Exchange rate locked at booking time** — customer sees the same price throughout
4. **All mutations idempotent** — `Idempotency-Key` header required
5. **Dispatch via BullMQ** — never inline, never in Next.js routes
6. **Webhook outbox** — Stripe webhooks write to DB first, process async
7. **State machine enforced** — reject illegal booking transitions
8. **BookingEvent audit** — every status change logged
9. **Throttled location writes** — never every-second writes to Postgres
10. **Presigned uploads** — files never pass through API server
11. **WebSocket auth on every subscription** — verify user has access to requested channel
12. **Redis pub/sub for horizontal scaling** — never rely on in-memory state alone
13. **RTL tested on every component** — Arabic is a first-class locale, not an afterthought
14. **Western digits in Arabic UI** — never use Arabic-Indic digits (٠-٩)
