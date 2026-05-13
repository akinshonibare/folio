# This is NOT the Next.js you know

This project runs Next.js 16. Routing, caching, and async APIs have breaking changes from earlier versions. Read the relevant guide in `node_modules/next/dist/docs/` before writing route handlers, server components, or `params`/`searchParams` consumers.

# Read TODO.md first

Before starting non-trivial work, read [`TODO.md`](./TODO.md) at the repo root. It records deferred features, known data-quality quirks, "don't-regress" invariants the codebase depends on, and operational notes. Update it when you finish or defer work — it's the durable replacement for the per-session todo list.

# Sibling projects

- `/Users/akin/Projects/invest-manage` — single-user dark crypto-terminal portfolio terminal. Same Wealthsimple CSV source. **Folio is a fresh build, not a fork.** Some libs (CSV parser, sentiment fetchers, FX rates) may be ported when useful, but the schema, auth model, theme, and UI conventions are intentionally different — folio is multi-user, Delta-inspired (clean, mobile-first card UI), and supports stocks + options + crypto from day 1.
- `/Users/akin/Projects/tickerroom` — multi-user research workspace (Telegram-based ticker discussions). Different product.

# Theme intent

Delta by eToro is the visual reference: soft dark mode (not pure black), generous spacing, rounded cards, big hero numbers, tabular figures, subtle motion. Mobile-first layout that holds up on a wide desktop monitor. Green/red for P&L, cool accent for primary actions.
