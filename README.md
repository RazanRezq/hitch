# Hitch

Ride-booking platform for **KEF ↔ Reykjavík** airport transfers.

Trilingual (Icelandic / English / Arabic with RTL) from day one, multi-currency (ISK / EUR / USD), native WebSockets, Stripe manual capture.

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 15+ (or SQLite for local quick-start)
- Redis 7+

## Setup

```bash
npm install
cp .env.example .env          # fill in values — at minimum DATABASE_URL
npm run db:generate
npm run db:migrate:dev        # creates initial schema
npm run dev                   # starts all three apps via Turborepo
```

## Apps

| App | URL | Purpose |
|---|---|---|
| Passenger | http://localhost:3000 | Public booking web (trilingual) |
| API | http://localhost:3001 | Hono backend + WebSockets |
| Dashboard | http://localhost:3002 | Admin / dispatcher panel |

Health check: `curl http://localhost:3001/api/health`

## Workspace layout

```
apps/
  passenger/   Next.js 15 — public booking
  dashboard/   Next.js 15 — admin panel
  api/         Hono — REST + WS server
packages/
  db/          Prisma schema + client
  types/       Shared TS types + Zod schemas
  api-client/  TanStack Query + WS client
  auth/        Better Auth config
  i18n/        Translations + format helpers
  ui/          Shared Shadcn + Soft Pop theme
  utils/       Geo, phone, booking-code helpers
```

## Architecture

See [`HITCH_MASTER_PLAN.md`](./HITCH_MASTER_PLAN.md) for the full plan and [`CLAUDE.md`](./CLAUDE.md) for coding rules.

## Common commands

```bash
npm run dev                        # all apps
npm run dev -w @hitch/passenger    # one app
npm run typecheck                  # all packages
npm run lint
npm run build

# Database
npm run db:generate
npm run db:migrate:dev
npm run db:studio
npm run db:seed
```
