import { NextResponse } from "next/server";
import { ensureUserRowForApi, getUserSettings } from "@/lib/auth/session";
import { db, schema } from "@/lib/db/client";
import { getFetcher } from "@/lib/quotes/provider";
import { getLatestSnapshot, getHoldings } from "@/lib/db/queries";
import { eq, sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Refresh live quotes for the user's latest snapshot. Writes into the
 * `live_quotes` cache, shared across users. Skips options (Yahoo doesn't
 * price them reliably) — see TODO.md phase 7 for Polygon.
 */
export async function POST() {
  const userId = await ensureUserRowForApi();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const settings = await getUserSettings(userId);
  const fetcher = getFetcher(settings?.quoteProvider ?? "yahoo");

  const snap = await getLatestSnapshot(userId);
  if (!snap) {
    return NextResponse.json({ refreshed: 0 });
  }
  const rows = await getHoldings(userId, snap.id);

  let refreshed = 0;
  const errors: string[] = [];
  for (const r of rows) {
    if (r.securityType === "OPTION") continue;
    const kind =
      r.securityType === "CRYPTOCURRENCY"
        ? "crypto"
        : r.securityType === "EXCHANGE_TRADED_FUND"
        ? "etf"
        : "equity";
    try {
      const q = await fetcher.fetch({
        symbol: r.symbol,
        exchange: r.exchange,
        kind,
      });
      if (!q) continue;
      await db()
        .insert(schema.liveQuotes)
        .values({
          instrumentId: r.instrumentId,
          price: q.price.toString(),
          currency: q.currency,
          dayChangePct:
            q.dayChangePct != null ? q.dayChangePct.toString() : null,
          provider: q.provider,
        })
        .onConflictDoUpdate({
          target: schema.liveQuotes.instrumentId,
          set: {
            price: q.price.toString(),
            currency: q.currency,
            dayChangePct:
              q.dayChangePct != null ? q.dayChangePct.toString() : null,
            provider: q.provider,
            fetchedAt: sql`now()`,
          },
        });
      refreshed++;
    } catch (e) {
      errors.push(
        `${r.symbol}: ${e instanceof Error ? e.message : "unknown error"}`,
      );
    }
  }
  return NextResponse.json({ refreshed, errors: errors.slice(0, 10) });
}
