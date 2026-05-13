import { finnhub } from "./client";
import { db, schema } from "@/lib/db/client";

/**
 * Refresh insider transactions for a symbol over the last `windowDays`.
 * Persists into `insider_transactions` so the UI reads from cache. Free-tier
 * Finnhub supports this endpoint; throttle is shared via the client.
 */
export async function refreshInsiderForSymbol(
  symbol: string,
  windowDays = 90,
): Promise<{ symbol: string; rows: number }> {
  const today = new Date();
  const to = today.toISOString().slice(0, 10);
  const fromDate = new Date(today);
  fromDate.setDate(fromDate.getDate() - windowDays);
  const from = fromDate.toISOString().slice(0, 10);

  let resp;
  try {
    resp = await finnhub.insiders(symbol, from, to);
  } catch {
    return { symbol, rows: 0 };
  }
  const rows = resp?.data ?? [];
  let n = 0;
  for (const r of rows) {
    try {
      await db()
        .insert(schema.insiderTransactions)
        .values({
          symbol,
          insiderName: r.name,
          filingDate: r.filingDate,
          transactionDate: r.transactionDate,
          shares: String(r.share),
          change: String(r.change),
          price: String(r.transactionPrice),
          code: r.transactionCode,
        })
        .onConflictDoNothing();
      n++;
    } catch {}
  }
  return { symbol, rows: n };
}
