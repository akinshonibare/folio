import { finnhub, type FinnhubCalendarEarnings } from "./client";
import { db, schema } from "@/lib/db/client";
import { sql } from "drizzle-orm";

/**
 * Refresh upcoming earnings for a list of symbols. Finnhub's free
 * `/calendar/earnings` is throttled at ~60 req/min via the shared client
 * throttle; we query per-symbol with a window of [today, today+90d].
 * Persisted into `earnings_events` so the dashboard reads from cache, not
 * live Finnhub on every page load.
 */
export async function refreshEarningsForSymbols(
  symbols: string[],
  windowDays = 90,
): Promise<{ inserted: number; updated: number; symbols: number }> {
  if (symbols.length === 0) {
    return { inserted: 0, updated: 0, symbols: 0 };
  }
  const today = new Date();
  const from = today.toISOString().slice(0, 10);
  const toDate = new Date(today);
  toDate.setDate(toDate.getDate() + windowDays);
  const to = toDate.toISOString().slice(0, 10);

  let inserted = 0;
  let updated = 0;
  for (const sym of symbols) {
    let resp: FinnhubCalendarEarnings | null = null;
    try {
      resp = await finnhub.upcomingEarnings(sym, from, to);
    } catch {
      continue;
    }
    for (const e of resp?.earningsCalendar ?? []) {
      try {
        const res = await db()
          .insert(schema.earningsEvents)
          .values({
            symbol: e.symbol,
            date: e.date,
            kind: "EARNINGS",
            epsActual: e.epsActual != null ? String(e.epsActual) : null,
            epsEstimate: e.epsEstimate != null ? String(e.epsEstimate) : null,
            quarter: e.quarter ?? null,
            year: e.year ?? null,
            hour: e.hour ?? null,
          })
          .onConflictDoUpdate({
            target: [
              schema.earningsEvents.symbol,
              schema.earningsEvents.date,
              schema.earningsEvents.kind,
            ],
            set: {
              epsActual:
                e.epsActual != null ? String(e.epsActual) : null,
              epsEstimate:
                e.epsEstimate != null ? String(e.epsEstimate) : null,
              quarter: e.quarter ?? null,
              year: e.year ?? null,
              hour: e.hour ?? null,
              fetchedAt: sql`now()` as unknown as Date,
            },
          })
          .returning({ id: schema.earningsEvents.id });
        if (res.length) inserted++;
      } catch {
        updated++;
      }
    }
  }
  return { inserted, updated, symbols: symbols.length };
}
