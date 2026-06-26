# Hitch — Project Status

> **Update this file at the end of any session that changes project state.**

Single source of truth for where Hitch stands, generated from actual git/repo state so a
fresh session or new device can get oriented without re-auditing the repo.

- **Last updated:** 2026-06-26
- **Current `main`:** `3ee2862` — _docs: add STATUS.md_ (last feature merge: #42 tours wiring, `c9523f3`)

---

## ✅ Shipped / merged to main

| Area | Detail | PR |
|---|---|---|
| **Pricing engine** | Table-driven fares, real Google Directions road distance, per-currency fixed fares, postal-zone detection, KEF 490 gate fee | **#41** |
| **Tours wiring / API** | Public tours catalog + per-currency quote API; EUR-native tour fares | **#42** |
| **Foundation hardening** | Exchange-rate worker + daily cron, Vitest + money-path tests, GitHub Actions CI, dropped legacy Better-Auth tables, removed dead 501 stubs, completed `.env.example` | **#37** |
| **Passenger web** | Landing (WebGL aurora hero), 3-step booking wizard, Stripe manual-capture payments, guest checkout, live WebSocket status, complaint/feedback flow with evidence uploads | — |
| **Dispatcher dashboard** | RBAC-gated; overview KPIs, bookings/drivers/fleet, live Google map dispatch | — |
| **Backend** | Hono API, Clerk auth + user-sync webhook, WS server + Redis pub/sub, DO Spaces presigned uploads, dispatch + webhook workers | — |

## 🚧 In flight

| Branch | Open PR? | Notes |
|---|---|---|
| `feat/tours-catalog-ui` | **#43** (open) | 3 commits ahead of main (catalog page + cards + header nav, overflow fix). Consumes the merged tours API. Typecheck/lint/tests green. Awaiting review/merge. |

## ⏳ Pending / not started

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

## ⛔ Blocked on client (decisions, not code)

- **490 fee direction** — origin-only (KEF departures) vs. both ways.
- **>100 km surcharge currency** — EUR vs. ISK; need a worked example to confirm.
- **Port / cruise prices** — not provided.
- **Combo fares** — 5–8 and 9–16 passenger tier prices not provided.

## 🧪 Test status

- `npm test` (`vitest run`): **101 tests passing, 14 files, 0 failures** (~2.6s).
- Pricing and tours tests **assert real fare amounts** (not just shape) — money path is covered:
  fares (19), tours pricing (12), quote interface (12), payments (6), Stripe webhook outbox (4),
  idempotency (4), booking state machine (8), plus currency/geocoding/routing/RTL smoke.

---

> **Note:** `PROJECT_OVERVIEW.md` is stale (~10 days, gitignored, generated on an older
> branch) and lists several already-shipped items as gaps. Trust git history + this file instead.
