import { NextResponse } from "next/server";
import { ensureUserRowForApi } from "@/lib/auth/session";
import { getLatestSnapshot, getHoldings } from "@/lib/db/queries";
import { refreshOptionsForHoldings } from "@/lib/quotes/batch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Allow up to 5 minutes — Polygon free tier @ 5 req/min means 16 options can
// take ~3+ minutes to refresh sequentially.
export const maxDuration = 300;

export async function POST() {
  const userId = await ensureUserRowForApi();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const snap = await getLatestSnapshot(userId);
  if (!snap) {
    return NextResponse.json({ refreshed: 0, skipped: 0 });
  }
  const holdings = await getHoldings(userId, snap.id);
  const targets = holdings
    .filter((h) => h.securityType === "OPTION")
    .map((h) => ({
      instrumentId: h.instrumentId,
      symbol: h.symbol,
      exchange: h.exchange,
      kind: "option" as const,
      brokerCurrency: h.marketPriceCurrency,
    }));
  const result = await refreshOptionsForHoldings(targets);
  return NextResponse.json(result);
}
