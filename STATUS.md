# Hitch — Project Status

> **Update this file at the end of any session that changes project state.**

Single source of truth for where Hitch stands, generated from actual git/repo state so a
fresh session or new device can get oriented without re-auditing the repo.

- **Last updated:** 2026-07-07
- **Current `main`:** `a451193` — _Merge #60 (scheduled-dispatch delay)_ (recent merges: #58 `c6e3b6e`, #59 `91d0040`, #60 `a451193`; all branches deleted, no open PRs)

---

## ✅ Shipped / merged to main

| Area | Detail | PR |
|---|---|---|
| **Pricing engine** | Table-driven fares, real Google Directions road distance, per-currency fixed fares, postal-zone detection, KEF 490 gate fee | **#41** |
| **Tours wiring / API** | Public tours catalog + per-currency quote API; EUR-native tour fares | **#42** |
| **Tours catalog UI** | `/tours` page, TourCard grid, header nav link, ISK/EUR/USD toggle, is/en i18n; consumes `GET /api/tours` for live prices | **#43** |
| **Pricing: >16 + combo** | >16 pax returns the manual-quote signal (422 `{ manualQuoteRequired: true }`) instead of a 400; Airport→Blue Lagoon→Reykjavík combo wired end-to-end — 1-4 at **42,090 ISK** (41,600 + 490 origin fee), pending tiers/currencies return manual-quote | **#44** |
| **Combo landing preset** | Combo as a 4th preset trip card (`kef-to-blue-lagoon-to-rvk`); booking draft carries `combo`/`via`, quote prices the combo, route card shows the Blue Lagoon stop; is/en strings | **#45** |
| **Combo booking-price fix** | The combo quoted 42,090 ISK but the booking dropped the `combo` flag and re-priced as a plain KEF→RVK trip; forwarded `combo` through `createBookingSchema` → payment step → the server re-quote so the Booking + PaymentIntent price the combo. Verified end-to-end (booking persists 42,090; pending EUR/5-8 still 422) | **#46** |
| **Payment-step StrictMode fix** | Dev "Preparing…" hang — the create-booking call fired from a `useEffect`, so React StrictMode's double-invoke reset the TanStack Query observer and `create.data` never populated (Stripe element never mounted). Reworked to a keyed `useQuery` (single-flight, StrictMode-safe) | **#47** |
| **Receipts + QR + public view** | Issued fare receipts (kvittun — receipts, _not_ legal invoices): `Receipt` model + migration (SERIAL number `R00001`, immutable trip snapshot); admin list/detail/issue (from a paid booking — idempotent, requires a captured payment — or a manual in-car/cash ride); branded printable `ReceiptDocument` (inline HITCH TAXI logo, **dependency-free inline-SVG QR** via vendored Nayuki — no npm); Receipts log + issue dialog + sidebar nav; **public** `GET /api/receipts/:id` (unguessable id) + `/[locale]/receipt/[id]` print page the QR resolves to. Dispatcher can now advance a trip `ACCEPTED → … → COMPLETED` from the booking page. Seeded samples; `scripts/preview-receipt.ts`. is/en | **#48** |
| **Landing hero + header** | Hero booking widget: friendly "Today/Tomorrow · HH:mm" label over the native `datetime-local` input (`formatWhenLabel()`); header nav scroll-spy (active section from scroll position + route). is/en | **#49** |
| **Booking codes** | Human-friendly `HTCH-XXXX-XXXX` booking codes generated server-side | **#50** |
| **Places autocomplete migration** | Migrated off deprecated `Autocomplete` to `PlaceAutocompleteElement`; hero widget visually blended into the hero field via the correct `--gmp-*` theming tokens | **#51, #57** |
| **Live "cars on shift"** | Header strip wired to real fleet data (was static) | **#52** |
| **Support phone reconcile** | Support phone unified to `+354 555 1234` across is/en strings | **#53** |
| **Dispatch map markers** | Driver markers migrated to `AdvancedMarkerElement` (legacy `Marker` deprecated) | **#54** |
| **Money-path hardening** | Driver-assign capture failure now reconciles against the real Stripe intent state instead of flipping the booking blind (#55); `payment_intent.canceled` (e.g. Stripe's 7-day hold expiry) now reconciles ANY pre-capture booking — CONFIRMED/SEARCHING included, previously silently skipped — to `CANCELLED_BY_SYSTEM`, and never touches captured/terminal bookings (#56) | **#55, #56** |
| **Booking confirmation email** | On PENDING_PAYMENT → CONFIRMED the webhook worker sends a branded is/en email (booking-code pill, trip details, locked price) with a **guest-token recovery link** (re-derived HMAC, same `?t=` param) — the durable way back into a guest booking if the tab closes. Shared transactional-email shell extracted to `services/email/shell.ts` (feedback emails now consume it); `book.email` strings (is first); preview script; best-effort send (skips when `RESEND_API_KEY` unset, never throws, exactly-once via the status guard) | **#58** |
| **Rate limiting + Sentry** | Shared fixed-window Redis limiter (`middleware/rate-limit.ts`, per-IP, **fail-open**): quotes 30/min, bookings 5/min, uploads 20/min, feedback refactored onto it (honeypot-before-limit preserved). `@sentry/node` in all 3 processes (Next via `src/instrumentation.ts` + Hono `onError`; workers with `worker.on('failed')` hooks so jobs that exhaust retries stop dying silently; ws runner) — no-op until `SENTRY_DSN` is set on Railway. Lockfile updated under Node 20, Linux optionals verified | **#59** |
| **Scheduled-dispatch delay** | Future-scheduled bookings no longer flood today's SEARCHING queue: the webhook worker enqueues dispatch with a BullMQ delay so the booking surfaces at `scheduledTime − DISPATCH_LEAD_MINUTES` (default 60, env-tunable). ASAP trips unchanged (delay 0). `dispatch_deferred` BookingEvent records `dispatchAt` in the CONFIRMED transaction; cancellations while parked no-op on the existing CONFIRMED guard; early manual assign still works | **#60** |
| **Foundation hardening** | Exchange-rate worker + daily cron, Vitest + money-path tests, GitHub Actions CI, dropped legacy Better-Auth tables, removed dead 501 stubs, completed `.env.example` | **#37** |
| **Passenger web** | Landing (WebGL aurora hero), 3-step booking wizard, Stripe manual-capture payments, guest checkout, live WebSocket status, complaint/feedback flow with evidence uploads | — |
| **Dispatcher dashboard** | RBAC-gated; overview KPIs, bookings/drivers/fleet, live Google map dispatch | — |
| **Backend** | Hono API, Clerk auth + user-sync webhook, WS server + Redis pub/sub, DO Spaces presigned uploads, webhook workers. Dispatch worker only flips CONFIRMED → SEARCHING and pings the dispatcher channel — assignment itself is manual (see readiness audit below) | — |

## 🚧 In flight

- **Driver mobile-web surface** — `feat/driver-mobile-web` (local branch, no PR yet); the pilot long pole, being built in a parallel session.
- **No-driver timeout** — `feat/no-driver-timeout` (worktree `.claude/worktrees/timeout-work`, no PR yet).

## 🎯 Readiness assessment (full-code audit, 2026-07-04)

Four-way audit of the actual code (money path, dispatch/realtime/driver side, passenger/admin
surfaces, infra/schema) — verified against routes/workers, not docs. Effort scale:
**S** = hours–1 day, **M** = 2–5 days, **L** = 1–2+ weeks.

### A) Demo-ready — ✅ now (runbook, not code)

Every happy-path step is wired and verified end-to-end: book → quote (real Directions
distance) → Stripe manual-capture auth (`services/payments`) → webhook outbox → CONFIRMED →
SEARCHING (`dispatch.worker`) → manual assign captures-then-flips, reconciling expired holds
(`admin/bookings.ts` assign) → dispatcher advances to COMPLETED (state-machine-validated,
BookingEvents logged) → issue receipt → public QR page. Live map runs off `npm run simulate`;
confirmation page gets live WS status. Needs only an ops runbook: 4 processes
(`dev`/`ws`/`workers`/`simulate`), Stripe webhook forwarding (or the deployed env), seeded DB,
one rehearsal.

### B) Pilot-ready — ≈3–4 weeks (real drivers + real passengers, money moves)

| Gap | Reality in code | Effort | Client-dependent? |
|---|---|---|---|
| **Driver surface** | No driver auth or UI; `driver:{id}:jobs` channel is authorized but **never published to**; GPS exists only via the simulate script. Minimum: mobile-web `/driver` page — Clerk sign-in, job card, accept/advance buttons, GPS push into `publishDriverLocation()` | **L** (long pole) | No |
| **Payouts** | `payout.worker.ts` is a `console.log` stub; zero Stripe Connect code; `DriverPayout` model has no producer. Pilot interim: per-driver earnings report + manual transfer | **S–M** interim / **L** real | **Yes** — payout mechanism decision |
| ~~Booking-confirmation email~~ | ✅ **Shipped in #58** — confirmation email with guest-token recovery link sends on CONFIRMED | — | — |
| **Refunds / cancel-after-confirm** | No `stripe.refunds.create()` anywhere; `REFUNDED` status + `refundedAt` are dead schema; passenger cancel 409s after PENDING_PAYMENT; no admin refund button | **M** | Policy input (window/fee) |
| **No-driver timeout** | ~~Scheduled-dispatch delay~~ ✅ shipped in #60. Remaining: "no driver in X min after SEARCHING → void auth + cancel" not implemented — only Stripe's 7-day auto-cancel (#56) backstops. The #60 delayed-job machinery is directly reusable | **S–M** | Timeout duration is a product choice (sane default fine) |
| ~~Rate limiting + Sentry~~ | ✅ **Shipped in #59** — quotes/bookings/uploads limited, Sentry wired in all 3 processes. Remaining: set `SENTRY_DSN` on the Railway services (config, minutes) | — | — |

Build order: ~~email~~ (✅ #58) → ~~rate-limit/Sentry~~ (✅ #59) → ~~scheduled~~ (✅ #60) /
timeout → refunds → driver page (start day 1, it's the long pole) → payout interim report.

### C) Production — additionally

Auto-dispatch loop (score/offer/30s-timeout/escalate — explicitly deferred in
`services/dispatch/index.ts`) **L** · passenger accounts + trip history **M–L** · tour booking
flow (catalog CTA is a `tel:` link) **M** · promo codes or drop the dead
`PromoCode`/`PromoRedemption` models **M/S** · missing webhook handlers (`charge.refunded`,
`payment_intent.succeeded`) **S–M** · legal pages + cookie consent + GDPR export/delete
(**client legal text**) **M** · admin role-management UI + Pricing/Payments/Reports pages **M**
· robots.txt/sitemap/JSON-LD **S** · Railway healthchecks for ws/workers + CI deploy step
**S** · test coverage for dispatch, admin endpoints, WS auth, guest tokens **M** ·
client-blocked fare data (see below). `TripLocationHistory` is written but never queried
(trip playback = Phase 2).

## ⏳ Pending / not started

- **Tour booking flow** — catalog UI (#43) is display-only; selecting + paying for a tour is a separate slice, not built.
- **Driver payout worker** — still a stub; no Stripe Connect transfers.
- **Auto-dispatch loop** — offer → 30s timeout → next driver; currently manual/dispatcher-only.
- **Real driver GPS** — `publishDriverLocation()` is only driven by the `simulate` script; no real driver feed.
- **Refunds** — completely unimplemented (no Stripe refund call, no `charge.refunded` handler; `REFUNDED` status is dead schema). Passenger cancel only works while PENDING_PAYMENT.
- **Booking lifecycle emails (beyond confirmation)** — confirmation email shipped in #58 (with guest-link recovery); driver-assigned and receipt emails still don't exist.
- **No-driver timeout** — promised "void after X min" doesn't exist; Stripe's 7-day auto-cancel is the only backstop. (Scheduled-dispatch delay shipped in #60; its delayed-job machinery is reusable here.)
- **Observability beyond error capture** — Sentry errors wired (#59, needs `SENTRY_DSN` on Railway to go live); structured logs and alerting still don't exist.
- **Promo-code checkout** — tables exist; no redemption flow/UI.
- **Passenger accounts / history** — booking works as guest; no logged-in trip history.
- **Admin Pricing / Payments / Reports pages** — nav links exist; pages don't. (A Receipts page now exists, via #48.)
- **Admin role management** — promotion to SUPER_ADMIN/DISPATCHER is manual in the DB (known process); no UI.
- **Driver document upload** — admin can verify docs but not upload them.

## 🔭 Out of scope (Phase 2)

- **Driver mobile app** (React Native + Expo) — biggest real-world gap; driver-side is dispatcher-simulated today.
- **Passenger mobile app** (React Native + Expo).
- **RTL / Arabic locale** — removed June 2026; plumbing retained dormant, no RTL locale ships.

## ⛔ Blocked on client (data still owed — `null` placeholders, do NOT invent)

- **Port / cruise prices** — 18 values: Port↔Airport and Port↔Blue Lagoon × 1-4 / 5-8 / 9-16 × ISK/EUR/USD (`config.ts` `PORT_FARES`, all `null`).
- **Combo 5-8 & 9-16 (+ all combo EUR/USD)** — 8 values still owed: 5-8 & 9-16 ISK/EUR/USD, plus 1-4 EUR/USD (`config.ts` `COMBO_FARES`). 1-4 ISK (41,600) is live on `main` — quotable at 42,090 incl. the 490 origin fee and selectable as a landing preset; every pending tier/currency returns the manual-quote signal until the client confirms numbers.

_Confirmed 2026-06-26, no longer blocking: **490 airport fee** = origin-only (trips FROM KEF only); **>100 km surcharge** = 375 kr/km ISK-native (= 2.5 €/km at the locked 150)._

### Decisions owed (surfaced by the 2026-07-04 readiness audit)

- **Driver payout mechanism** — Stripe Connect (contractors) vs payroll/manual transfer; blocks anything beyond the interim earnings report.
- **Kvittun vs legal invoice** — receipts (#48) are explicitly fare receipts, _not_ legal invoices; does Icelandic law require more for the pilot?
- **Cancellation/refund policy** — window + fee, needed to build the refund path with correct defaults.
- **Far-future booking charge policy** — surfaced by #60: bookings scheduled >~7 days out cannot work under manual capture at all (Stripe voids the uncaptured auth on day 7 → #56 cancels the booking before dispatch fires). Needs a decision: capture upfront, or re-authorize near the pickup date.

## 🧪 Test status

- `npm test` (`vitest run`): **136 tests passing, 17 files, 0 failures** (~4s, verified 2026-07-07). New in #59: rate-limit middleware (429 shape, per-IP keying + single TTL, fail-open on Redis error). New in #60: dispatch-delay math (window edges, invalid dates, env override), queue delay passthrough, worker deferral + audit event.
- Pricing and tours tests **assert real fare amounts** (not just shape) — money path is covered:
  fares, tours pricing, quote interface/display, payments, Stripe webhook outbox, idempotency,
  booking state machine, plus currency/geocoding/routing/RTL smoke. New since #49:
  parameterized `payment_intent.canceled` reconciliation cases (#56) — pre-capture statuses
  (PENDING_PAYMENT/CONFIRMED/SEARCHING) cancel + payment flips CANCELED; captured/terminal
  bookings are left untouched. New in #58: booking confirmation email — builder content /
  escaping / ISK NBSP formatting, guest-token URL round-trip, unconfigured-skip and
  never-throws contracts, and worker fires-once-on-authorization assertions.
- **Not covered** (per the readiness audit): dispatch service, admin endpoints, WS auth/channel
  subscriptions, receipt issuance, uploads, Clerk user-sync. (Guest-token HMAC round-trip is
  now covered via the #58 email tests.)
