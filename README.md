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
npm run dev                   # starts the Next.js app
```

## Surfaces & processes

| Surface / Process | URL / Command | Purpose |
|---|---|---|
| Passenger web | http://localhost:3000/[locale] | Public booking (trilingual) |
| Admin / dispatcher | http://localhost:3000/[locale]/admin | Nested under the same Next.js app |
| Hono API | http://localhost:3000/api/* | Mounted inside Next.js via `src/app/api/[[...route]]/route.ts` |
| WebSocket server | `npm run ws` | Separate process, `src/server/index.ts` (Next.js route handlers can't host long-lived WS) |
| BullMQ workers | `npm run workers` | Separate process (dispatch, webhooks, payouts, exchange rates) |

Health check: `curl http://localhost:3000/api/health`

## Project layout

This is a **single Next.js app** (no monorepo, no Turborepo, no workspaces). One `package.json` at the repo root.

```
hitch/
├── package.json              # plain npm, no workspaces
├── prisma/                   # schema.prisma, seed.ts, migrations
├── messages/                 # is.json, en.json, ar.json
├── public/
└── src/
    ├── app/
    │   ├── [locale]/         # passenger surface (root layout owns <html>/<body>)
    │   │   ├── page.tsx
    │   │   ├── book/
    │   │   └── admin/        # dispatcher/admin nested here (no <html>/<body>)
    │   └── api/[[...route]]/route.ts   # Hono mounted via hono/vercel handle()
    ├── components/           # passenger + admin/Sidebar + landing/* + brand/*
    ├── i18n/                 # next-intl routing + request
    ├── lib/                  # ui/ types/ db/ auth/ utils/ i18n-shared/ api-client/
    ├── server/               # Hono app, routes, services, realtime, workers
    │   ├── app.ts            # bare Hono app
    │   └── index.ts          # standalone WS runner (npm run ws)
    ├── stores/  providers.tsx  proxy.ts
```

## Architecture

See [`HITCH_MASTER_PLAN.md`](./HITCH_MASTER_PLAN.md) for the full plan and [`CLAUDE.md`](./CLAUDE.md) for coding rules.

## Common commands

```bash
npm run dev                        # Next.js (web + mounted Hono API)
npm run ws                         # WebSocket process
npm run workers                    # BullMQ workers
npm run lint
npm run build

# Database
npm run db:generate
npm run db:migrate:dev
npm run db:studio
npm run db:seed
```
