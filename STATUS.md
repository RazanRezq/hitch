# Hitch — Project Status

> **Update this file at the end of any session that changes project state.**

Single source of truth for where Hitch stands, generated from actual git/repo state so a
fresh session or new device can get oriented without re-auditing the repo.

- **Last updated:** 2026-06-26
- **Current `main`:** `96b71da` — _docs: record tours-catalog-ui (#43) merged_ (last feature merge: #43, `2ec396e`; merged branch deleted)

---

## ✅ Shipped / merged to main

| Area | Detail | PR |
|---|---|---|
| **Pricing engine** | Table-driven fares, real Google Directions road distance, per-currency fixed fares, postal-zone detection, KEF 490 gate fee | **#41** |
| **Tours wiring / API** | Public tours catalog + per-currency quote API; EUR-native tour fares | **#42** |
| **Tours catalog UI** | `/tours` page, TourCard grid, header nav link, ISK/EUR/USD toggle, is/en i18n; consumes `GET /api/tours` for live prices | **#43** |
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

## 🔭 Out of scope (Phase 2)

- **Driver mobile app** (React Native + Expo) — biggest real-world gap; driver-side is dispatcher-simulated today.
- **Passenger mobile app** (React Native + Expo).
- **RTL / Arabic locale** — removed June 2026; plumbing retained dormant, no RTL locale ships.

## ⛔ Blocked on client (data still owed — `null` placeholders, do NOT invent)

- **Port / cruise prices** — 18 values: Port↔Airport and Port↔Blue Lagoon × 1-4 / 5-8 / 9-16 × ISK/EUR/USD (`config.ts` `PORT_FARES`, all `null`).
- **Combo 5-8 & 9-16** — 8 values: ISK/EUR/USD each (1-4 ISK 41,600 already in; `config.ts` `COMBO_FARES`).

_Confirmed 2026-06-26, no longer blocking: **490 airport fee** = origin-only (trips FROM KEF only); **>100 km surcharge** = 375 kr/km ISK-native (= 2.5 €/km at the locked 150)._

## 🧪 Test status

- `npm test` (`vitest run`): **101 tests passing, 14 files, 0 failures** (~2.6s).
- Pricing and tours tests **assert real fare amounts** (not just shape) — money path is covered:
  fares (19), tours pricing (12), quote interface (12), payments (6), Stripe webhook outbox (4),
  idempotency (4), booking state machine (8), plus currency/geocoding/routing/RTL smoke.

---

> **Note:** `PROJECT_OVERVIEW.md` is stale (~10 days, gitignored, generated on an older
> branch) and lists several already-shipped items as gaps. Trust git history + this file instead.
