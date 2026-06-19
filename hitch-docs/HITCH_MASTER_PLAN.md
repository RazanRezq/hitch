# HITCH — Master Project Plan
> Ride-booking platform for airport ↔ hotel transfers  
> Last updated: April 2026

---

## 1. Project Overview

Hitch is a streamlined ride-booking platform built primarily for airport-to-hotel and hotel-to-airport transfers. It prioritizes a frictionless passenger booking experience while providing robust tools for drivers and administrators.

**Core Principles:**
- One-tap booking as the primary UX goal
- Clean, minimalist "Soft Pop" design aesthetic
- Unified backend serving all four surfaces
- Mobile-first, but web-complete

---

## 2. Platform Surfaces

| Surface | Platform | Audience | Priority |
|---|---|---|---|
| Passenger Web | Next.js (Browser) | Passengers | ✅ Phase 1 |
| Management Dashboard | Next.js (Browser) | Admins / Dispatchers | ✅ Phase 1 |
| Passenger App | React Native + Expo | Passengers | 🔜 Phase 2 |
| Driver App | React Native + Expo | Drivers | 🔜 Phase 2 |

### Surface Responsibilities

**Passenger Web (Next.js)**
- Landing page + search widget
- Quote / pricing results
- Booking confirmation + payment
- Booking history (account page)
- Confirmation emails / receipts

**Management Dashboard (Next.js)**
- Live dispatch map
- Bookings management + driver assignment
- Driver & fleet management
- Pricing zones + fare configuration
- Payments, refunds, payouts
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
- Daily / weekly earnings

---

## 3. Tech Stack

### Web (Phase 1)
| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS v4 |
| Components | Shadcn UI + Acernity UI |
| State / Data | TanStack Query + Zustand |
| Auth | Supabase Auth |
| Database | Supabase (PostgreSQL) |
| Real-time | Supabase Realtime (MVP) → Socket.io (scale) |
| Maps | Google Maps API |
| Payments | Stripe |
| Hosting | Vercel (web) + Railway/Render (API) |

### Mobile (Phase 2)
| Layer | Technology |
|---|---|
| Framework | React Native + Expo |
| Navigation | Expo Router |
| Maps | Google Maps (react-native-maps) |
| Push Notifications | Expo Notifications |
| Payments | Stripe React Native SDK |

### Backend API
| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Fastify (or Express) |
| Database | Supabase PostgreSQL |
| Real-time | Supabase Realtime → Socket.io |

> ⚠️ Supabase alone is not sufficient — a custom API layer is required for dispatch logic, trip state machine, and business rules.

---

## 4. Visual Identity — Soft Pop Theme

### Colors (OKLCH)
| Token | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| Background | `oklch(0.9789 0.0082 121.6272)` | `oklch(0 0 0)` | Page background |
| Foreground | `oklch(0 0 0)` | `oklch(1.0000 0 0)` | All text |
| Primary | `oklch(0.5106 0.2301 276.9656)` | `oklch(0.6801 0.1583 276.9349)` | CTAs, buttons |
| Secondary | `oklch(0.7038 0.1230 182.5025)` | — | Secondary actions |
| Accent | `oklch(0.7686 0.1647 70.0804)` | — | Alerts, highlights |
| Card (dark) | — | `oklch(0.2455 0.0217 257.2823)` | Cards in dark mode |
| Destructive | `oklch(0.6368 0.2078 25.3313)` | — | Cancel / delete actions |
| Ring | `oklch(0.7853 0.1041 274.7134)` | — | Input focus state |

### Typography
- **Primary:** `DM Sans` — all UI text, headings, buttons, labels
- **Secondary:** `Space Mono` — booking IDs, receipt numbers, GPS coords, fare breakdowns

### UI Geometry
- **Border Radius:** `1rem` (16px) on all cards, buttons, dialogs, widgets
- **Shadows:** Very low opacity (`0.05`) with dark base `#1a1a1a` — subtle floating effect
- **Borders:** Thin, subtle — defines sections without heavy shading

---

## 5. User Roles (RBAC)

| Role | Access |
|---|---|
| Super Admin | Full access — business settings, financials, platform config |
| Dispatcher | Live map, manual dispatch, active booking edits |
| Driver | Assigned jobs, personal earnings, navigation |
| Passenger | Personal bookings, payment methods, live trip tracking |

---

## 6. Core Data Entities

```
Users:         id, role, name, phone, auth_token
Fleet/Cars:    id, driver_id, vehicle_type (Sedan/SUV/Van), capacity, license_plate
Bookings:      id, passenger_id, driver_id, pickup_location, dropoff_location,
               scheduled_time, status, price
PricingZones:  id, zone_polygon (GeoJSON), base_fare, per_km_rate
```

**Booking Status Flow:**
```
Pending → Accepted → In-Transit → Completed
                  ↘ Cancelled
```

### Security
- Payment data is tokenized — no card details stored on Hitch DB
- Live location shared only between assigned driver and passenger during active trip

---

## 7. The 7-Step Booking Workflow

| Step | Name | Description |
|---|---|---|
| 1 | Search | Passenger enters From/To, date/time, passenger count |
| 2 | Quote | System calculates route, displays car types + estimated prices |
| 3 | Confirmation | Passenger confirms, completes payment, receives receipt |
| 4 | Dispatch | Backend auto-assigns driver (or dispatcher manually assigns) |
| 5 | Transit | Driver navigates to pickup. Live GPS shared with passenger |
| 6 | Completion | Trip ends, payment settled, passenger rates driver, final receipt sent |
| 7 | Logging | Trip data pushed to admin dashboard — revenue + analytics updated |

---

## 8. Project Structure (Monorepo)

```
hitch/
├── apps/
│   ├── passenger/              # Next.js — Public booking web app
│   └── dashboard/              # Next.js — Admin/management panel
│
├── packages/
│   ├── ui/                     # Shared Shadcn-based component library
│   ├── types/                  # Shared TypeScript interfaces
│   ├── api-client/             # Shared TanStack Query hooks
│   └── utils/                  # Shared helpers (geo, dates, formatting)
│
├── package.json                # pnpm workspaces root
└── turbo.json                  # Turborepo config
```

### `apps/passenger/` Structure
```
src/app/
├── page.tsx                    # Landing page
├── search/page.tsx             # Quote results
├── booking/
│   ├── confirm/page.tsx        # Payment + confirmation
│   └── [id]/page.tsx           # Active trip (tracking — Phase 2 web)
└── account/
    ├── trips/page.tsx          # Booking history
    └── settings/page.tsx

src/components/
├── search/
│   ├── SearchWidget.tsx
│   ├── PresetCard.tsx          # "Airport → Hotel" one-tap cards
│   └── DateTimePicker.tsx
├── booking/
│   ├── CarTypeCard.tsx
│   ├── PriceSummary.tsx
│   └── PaymentForm.tsx
└── trip/
    ├── LiveMap.tsx
    └── TripStatusBar.tsx
```

### `apps/dashboard/` Structure
```
src/app/
├── overview/page.tsx           # Live map + stats
├── bookings/
│   ├── page.tsx                # All bookings table
│   └── [id]/page.tsx           # Booking detail + assign driver
├── drivers/
│   ├── page.tsx
│   └── [id]/page.tsx
├── fleet/page.tsx
├── pricing/page.tsx
├── payments/page.tsx
└── reports/page.tsx

src/components/
├── dispatch/
│   ├── LiveDispatchMap.tsx
│   └── AssignDriverModal.tsx
├── bookings/
│   ├── BookingsTable.tsx
│   └── BookingStatusBadge.tsx
├── drivers/
│   ├── DriverCard.tsx
│   └── ComplianceStatus.tsx
└── layout/
    ├── Sidebar.tsx
    └── TopBar.tsx
```

---

## 9. Route Map

| Route | App | Description |
|---|---|---|
| `/` | passenger | Landing page |
| `/search` | passenger | Quote results |
| `/booking/confirm` | passenger | Payment + confirmation |
| `/booking/[id]` | passenger | Live trip tracking |
| `/overview` | dashboard | Live dispatch map |
| `/bookings` | dashboard | All bookings |
| `/bookings/[id]` | dashboard | Booking detail |
| `/drivers` | dashboard | Driver management |
| `/drivers/[id]` | dashboard | Driver profile |
| `/fleet` | dashboard | Vehicle records |
| `/pricing` | dashboard | Fare configuration |
| `/payments` | dashboard | Transactions + payouts |
| `/reports` | dashboard | Analytics |

---

## 10. Build Order (Phase 1 — Web)

### Passenger Web
1. Landing page — SearchWidget + PresetCards
2. Search/quote results page — CarTypeCard grid
3. Booking confirmation + payment page
4. Account / booking history page

### Management Dashboard
1. Layout shell — Sidebar + TopBar
2. Overview page — Live dispatch map
3. Bookings table + detail page
4. Drivers management
5. Pricing configuration
6. Payments + reports

---

## 11. Key Decisions Log

| Decision | Choice | Reason |
|---|---|---|
| Driver surface | React Native (Phase 2) | Background GPS + push notifications require native |
| Backend | Node.js API + Supabase | Custom dispatch/state logic can't live in Supabase alone |
| Real-time (MVP) | Supabase Realtime | Fast to ship; migrate to Socket.io at scale |
| Payments | Stripe | Best DX; verify regional support for target market |
| Monorepo tool | Turborepo + pnpm | Shared types/components between passenger + dashboard |
| Maps | Google Maps API | Better autocomplete quality vs. Mapbox for most regions |
