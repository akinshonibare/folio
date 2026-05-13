import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/auth/cron";
import { db, schema } from "@/lib/db/client";
import { eq, sql } from "drizzle-orm";
import { refreshOptionsForHoldings } from "@/lib/quotes/batch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Daily cron: iterate every user that has options in their latest snapshot
 * and refresh EOD option prices via Polygon. Runs after US market close
 * (21:30 ET ≈ 01:30 UTC).
 */
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Find users with options in their most-recent snapshot.
  const userIds = (
    await db()
      .select({ userId: schema.positions.userId })
      .from(schema.positions)
      .innerJoin(
        schema.instruments,
        eq(schema.positions.instrumentId, schema.instruments.id),
      )
      .where(eq(schema.instruments.securityType, "OPTION"))
      .groupBy(schema.positions.userId)
  ).map((r) => r.userId);

  let totalRefreshed = 0;
  for (const userId of userIds) {
    const latest = await db()
      .select({ id: schema.snapshots.id })
      .from(schema.snapshots)
      .where(eq(schema.snapshots.userId, userId))
      .orderBy(sql`as_of desc`)
      .limit(1);
    if (latest.length === 0) continue;

    const targets = await db()
      .select({
        instrumentId: schema.positions.instrumentId,
        symbol: schema.instruments.symbol,
        exchange: schema.instruments.exchange,
        brokerCurrency: schema.positions.marketPriceCurrency,
      })
      .from(schema.positions)
      .innerJoin(
        schema.instruments,
        eq(schema.positions.instrumentId, schema.instruments.id),
      )
      .where(eq(schema.positions.snapshotId, latest[0].id));
    const optionTargets = targets
      .filter((t) => /\d{6}[CP]\d{8}/.test(t.symbol))
      .map((t) => ({
        instrumentId: t.instrumentId,
        symbol: t.symbol,
        exchange: t.exchange,
        kind: "option" as const,
        brokerCurrency: t.brokerCurrency,
      }));
    const r = await refreshOptionsForHoldings(optionTargets);
    totalRefreshed += r.refreshed;
  }
  return NextResponse.json({ users: userIds.length, refreshed: totalRefreshed });
}
