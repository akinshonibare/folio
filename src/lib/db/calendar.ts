import { and, gte, lte, inArray, desc, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";

export type CalendarEvent = {
  symbol: string;
  date: string;
  kind: "EARNINGS" | "DIVIDEND";
  hour: string | null;
  epsEstimate: number | null;
};

export async function getUpcomingEventsForSymbols(
  symbols: string[],
  windowDays = 45,
): Promise<CalendarEvent[]> {
  if (symbols.length === 0) return [];
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const end = new Date(today);
  end.setDate(end.getDate() + windowDays);
  const endIso = end.toISOString().slice(0, 10);

  const rows = await db()
    .select({
      symbol: schema.earningsEvents.symbol,
      date: schema.earningsEvents.date,
      kind: schema.earningsEvents.kind,
      hour: schema.earningsEvents.hour,
      epsEstimate: schema.earningsEvents.epsEstimate,
    })
    .from(schema.earningsEvents)
    .where(
      and(
        inArray(schema.earningsEvents.symbol, symbols),
        gte(schema.earningsEvents.date, todayIso),
        lte(schema.earningsEvents.date, endIso),
      ),
    )
    .orderBy(schema.earningsEvents.date);

  return rows.map((r) => ({
    symbol: r.symbol,
    date: r.date,
    kind: r.kind as "EARNINGS" | "DIVIDEND",
    hour: r.hour,
    epsEstimate: r.epsEstimate != null ? parseFloat(r.epsEstimate) : null,
  }));
}

export type InsiderRow = {
  symbol: string;
  insiderName: string;
  transactionDate: string;
  shares: number;
  change: number;
  price: number;
  code: string;
};

export async function getInsiderForSymbols(
  symbols: string[],
  limit = 20,
): Promise<InsiderRow[]> {
  if (symbols.length === 0) return [];
  const rows = await db()
    .select()
    .from(schema.insiderTransactions)
    .where(inArray(schema.insiderTransactions.symbol, symbols))
    .orderBy(desc(schema.insiderTransactions.filingDate))
    .limit(limit);
  return rows.map((r) => ({
    symbol: r.symbol,
    insiderName: r.insiderName,
    transactionDate: r.transactionDate,
    shares: parseFloat(r.shares),
    change: parseFloat(r.change),
    price: parseFloat(r.price),
    code: r.code,
  }));
}

export async function getAllDistinctOptionUserIds(): Promise<string[]> {
  const rows = await db()
    .select({ userId: schema.positions.userId })
    .from(schema.positions)
    .where(
      sql`exists (select 1 from instruments i where i.id = ${schema.positions.instrumentId} and i.security_type = 'OPTION')`,
    )
    .groupBy(schema.positions.userId);
  return rows.map((r) => r.userId);
}

/**
 * Distinct (symbol) across every user's latest snapshot — used by the cron
 * to refresh earnings/insider for the universe of held tickers.
 */
export async function getAllHeldSymbols(): Promise<string[]> {
  const rows = await db()
    .select({ symbol: schema.instruments.symbol })
    .from(schema.positions)
    .innerJoin(
      schema.instruments,
      sql`${schema.instruments.id} = ${schema.positions.instrumentId}`,
    )
    .where(
      sql`${schema.instruments.securityType} in ('EQUITY','EXCHANGE_TRADED_FUND')`,
    )
    .groupBy(schema.instruments.symbol);
  return rows.map((r) => r.symbol);
}
