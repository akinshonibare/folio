# folio

Multi-user portfolio tracker for stocks, options, and crypto. Upload your Wealthsimple holdings CSV; folio gives you a Delta-style dashboard, day-over-day movement, AI-assisted commentary driven by social sentiment, and friend groups so you can see what people you trust are holding (with optional dollar-amount masking).

## Stack

Next.js 16 (App Router) · React 19 · Tailwind v4 · Postgres (Neon) · Drizzle ORM · Clerk (auth) · yahoo-finance2 (default quote provider, free) · Polygon.io (optional, env-gated) · Reddit + Stocktwits (sentiment) · PWA-installable.

## Setup

### 1. Install
```bash
pnpm install
```

### 2. Database — Neon

Create a Neon Postgres database (via Vercel: Storage → Create → Neon, or directly at neon.tech). Put both URLs in `.env.local`:

```
DATABASE_URL=...         # pooled (pgbouncer) — used at runtime
DATABASE_URL_UNPOOLED=...# direct — used by drizzle-kit for DDL
```

### 3. Clerk

Create a free Clerk application at clerk.com. Copy keys into `.env.local`:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### 4. (Optional) Polygon

Yahoo Finance is the default quote provider — no key needed. If you also want Polygon as an option, set `POLYGON_API_KEY`. A toggle in Settings then lets each user pick Yahoo or Polygon. Without the env var, the toggle is hidden.

### 5. (Optional) Reddit sentiment

Free OAuth app at reddit.com/prefs/apps. Used to fetch r/wallstreetbets / r/stocks ticker mentions for the sentiment layer.

### 6. Run
```bash
pnpm db:migrate    # apply migrations
pnpm dev           # http://localhost:3000
```

## CSV format

Wealthsimple → Activity → Reports → Holdings (CSV). Drop the file unmodified. The parser:

- handles the trailing `"As of …"` line
- decodes OCC-format option symbols (`SNDK  260529C02000000` → SNDK call 2026-05-29 strike $2000)
- converts non-CAD positions using the snapshot-day FX rate
- treats every upload as a full point-in-time snapshot — positions that disappear are auto-archived

## Deploy

Vercel + Neon. `git push` to `main` deploys. `pnpm db:migrate` against the production `DATABASE_URL_UNPOOLED` once per schema change (not auto-run on build — see TODO.md for the rationale).
