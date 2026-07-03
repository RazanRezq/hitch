# Hitch — Project Status

> **Update this file at the end of any session that changes project state.**

Single source of truth for where Hitch stands, generated from actual git/repo state so a
fresh session or new device can get oriented without re-auditing the repo.

- **Last updated:** 2026-07-03
- **Current `main`:** `260e5e2` — _Merge #49 (landing hero)_ (recent merges: #47 `daf9336`, #48 `acdebbe`, #49 `260e5e2`; all branches deleted)

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
| **Foundation hardening** | Exchange-rate worker + daily cron, Vitest + money-path tests, GitHub Actions CI, dropped legacy Better-Auth tables, removed dead 501 stubs, completed `.env.example` | **#37** |
| **Passenger web** | Landing (WebGL aurora hero), 3-step booking wizard, Stripe manual-capture payments, guest checkout, live WebSocket status, complaint/feedback flow with evidence uploads | — |
| **Dispatcher dashboard** | RBAC-gated; overview KPIs, bookings/drivers/fleet, live Google map dispatch | — |
| **Backend** | Hono API, Clerk auth + user-sync webhook, WS server + Redis pub/sub, DO Spaces presigned uploads, dispatch + webhook workers | — |

## 🚧 In flight

_None — no open PRs or unmerged feature branches._

## ⏳ Pending / not started

- **Tour booking flow** — catalog UI (#43) is display-only; selecting + paying for a tour is a separate slice, not built.
- **Driver payout worker** — still a stub; no Stripe Connect transfers.
- **Auto-dispatch loop** — offer → 30s timeout → next driver; currently manual/dispatcher-only.
- **Real driver GPS** — `publishDriverLocation()` is only driven by the `simulate` script; no real driver feed.
- **Promo-code checkout** — tables exist; no redemption flow/UI.
- **Passenger accounts / history** — booking works as guest; no logged-in trip history.
- **Admin Pricing / Payments / Reports pages** — nav links exist; pages don't. (A Receipts page now exists, via #48.)

## 🔭 Out of scope (Phase 2)

- **Driver mobile app** (React Native + Expo) — biggest real-world gap; driver-side is dispatcher-simulated today.
- **Passenger mobile app** (React Native + Expo).
- **RTL / Arabic locale** — removed June 2026; plumbing retained dormant, no RTL locale ships.

## ⛔ Blocked on client (data still owed — `null` placeholders, do NOT invent)

- **Port / cruise prices** — 18 values: Port↔Airport and Port↔Blue Lagoon × 1-4 / 5-8 / 9-16 × ISK/EUR/USD (`config.ts` `PORT_FARES`, all `null`).
- **Combo 5-8 & 9-16 (+ all combo EUR/USD)** — 8 values still owed: 5-8 & 9-16 ISK/EUR/USD, plus 1-4 EUR/USD (`config.ts` `COMBO_FARES`). 1-4 ISK (41,600) is live on `main` — quotable at 42,090 incl. the 490 origin fee and selectable as a landing preset; every pending tier/currency returns the manual-quote signal until the client confirms numbers.

_Confirmed 2026-06-26, no longer blocking: **490 airport fee** = origin-only (trips FROM KEF only); **>100 km surcharge** = 375 kr/km ISK-native (= 2.5 €/km at the locked 150)._

## 🧪 Test status

- `npm test` (`vitest run`): **112 tests passing, 14 files, 0 failures** (~2.6s).
- Pricing and tours tests **assert real fare amounts** (not just shape) — money path is covered:
  fares (25), tours pricing (12), quote interface (12), quote display (11), payments (6),
  Stripe webhook outbox (4), idempotency (4), booking state machine (8), plus
  currency/geocoding/routing/RTL smoke. New coverage: >16-pax manual-quote (fixed + metered)
  and the combo quote (ISK price, pending-currency, pending-tier).
