import { db, schema } from "@/lib/db/client";
import { and, eq, sql } from "drizzle-orm";

/**
 * Find an instrument by user-facing symbol; create a placeholder row if it
 * doesn't yet exist. Used by the ticker-detail page and the watchlist add
 * flow when the user types in a ticker the broker hasn't reported yet.
 */
export async function findOrCreateInstrument(opts: {
  symbol: string;
  exchange?: string;
  name?: string | null;
  kind: "EQUITY" | "EXCHANGE_TRADED_FUND" | "CRYPTOCURRENCY" | "OTHER";
}): Promise<number> {
  const symbol = opts.symbol.toUpperCase();
  const exchange = opts.exchange ?? "";
  const existing = await db()
    .select({ id: schema.instruments.id })
    .from(schema.instruments)
    .where(
      and(
        eq(schema.instruments.symbol, symbol),
        eq(schema.instruments.exchange, exchange),
      ),
    )
    .limit(1);
  if (existing[0]) return existing[0].id;
  const [row] = await db()
    .insert(schema.instruments)
    .values({
      securityType: opts.kind,
      symbol,
      exchange,
      name: opts.name ?? null,
    })
    .returning({ id: schema.instruments.id });
  return row.id;
}

export async function addToWatchlist(
  userId: string,
  instrumentId: number,
  notes?: string,
): Promise<void> {
  await db()
    .insert(schema.watchlist)
    .values({ userId, instrumentId, notes: notes ?? null })
    .onConflictDoNothing();
}

export async function removeFromWatchlist(
  userId: string,
  instrumentId: number,
): Promise<void> {
  await db()
    .delete(schema.watchlist)
    .where(
      and(
        eq(schema.watchlist.userId, userId),
        eq(schema.watchlist.instrumentId, instrumentId),
      ),
    );
}

export async function isOnWatchlist(
  userId: string,
  instrumentId: number,
): Promise<boolean> {
  const rows = await db()
    .select({ id: schema.watchlist.id })
    .from(schema.watchlist)
    .where(
      and(
        eq(schema.watchlist.userId, userId),
        eq(schema.watchlist.instrumentId, instrumentId),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function getWatchlist(userId: string) {
  return db()
    .select({
      id: schema.watchlist.id,
      instrumentId: schema.instruments.id,
      symbol: schema.instruments.symbol,
      exchange: schema.instruments.exchange,
      name: schema.instruments.name,
      securityType: schema.instruments.securityType,
      notes: schema.watchlist.notes,
      graduated: schema.watchlist.graduated,
      addedAt: schema.watchlist.addedAt,
    })
    .from(schema.watchlist)
    .innerJoin(
      schema.instruments,
      eq(schema.watchlist.instrumentId, schema.instruments.id),
    )
    .where(eq(schema.watchlist.userId, userId));
}
