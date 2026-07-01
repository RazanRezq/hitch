# Hitch — Project Status

> **Update this file at the end of any session that changes project state.**

Single source of truth for where Hitch stands, generated from actual git/repo state so a
fresh session or new device can get oriented without re-auditing the repo.

- **Last updated:** 2026-07-01
- **Current `main`:** `a4401fd` — _Merge #46 (combo booking-price fix)_ (recent merges: #44 `34dc5b6`, #45 `74c54a5`, #46 `a4401fd`; all branches deleted)

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
- **Admin Pricing / Payments / Reports pages** — nav links exist; pages don't.
- **Payment step hangs on "Preparing…" in dev** — surfaced verifying #46: the create-booking mutation is fired from a `useEffect`, and React StrictMode's dev double-invoke resets the TanStack Query mutation observer, so the booking + PaymentIntent are created (200, valid `clientSecret`) but `create.data` never populates → the Stripe element never mounts. Dev-only (StrictMode doesn't double-invoke in prod builds), affects all bookings, not combo-specific. Fix = don't fire the mutation from an effect (or guard against the observer reset).

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
