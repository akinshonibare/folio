import { db, schema } from "@/lib/db/client";
import { and, desc, eq, sql } from "drizzle-orm";

/**
 * All snapshots for a user, ordered ascending by as_of date. Used to plot
 * portfolio value over time.
 */
export async function getAllSnapshots(userId: string) {
  return db()
    .select()
    .from(schema.snapshots)
    .where(eq(schema.snapshots.userId, userId))
    .orderBy(schema.snapshots.asOf);
}

/**
 * Latest snapshot for a user. Returns null if they've never uploaded.
 */
export async function getLatestSnapshot(userId: string) {
  const rows = await db()
    .select()
    .from(schema.snapshots)
    .where(eq(schema.snapshots.userId, userId))
    .orderBy(desc(schema.snapshots.asOf))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * The snapshot immediately before `currentSnapshotId` for the same user.
 * Used to compute day-over-day movement.
 */
export async function getPreviousSnapshot(
  userId: string,
  currentSnapshotId: number,
) {
  const current = await db()
    .select({ asOf: schema.snapshots.asOf })
    .from(schema.snapshots)
    .where(eq(schema.snapshots.id, currentSnapshotId))
    .limit(1);
  if (!current[0]) return null;
  const rows = await db()
    .select()
    .from(schema.snapshots)
    .where(
      and(
        eq(schema.snapshots.userId, userId),
        sql`${schema.snapshots.asOf} < ${current[0].asOf}`,
      ),
    )
    .orderBy(desc(schema.snapshots.asOf))
    .limit(1);
  return rows[0] ?? null;
}

export type HoldingRow = {
  positionId: number;
  accountId: number;
  accountName: string;
  accountClassification: string;
  instrumentId: number;
  symbol: string;
  exchange: string;
  name: string | null;
  securityType: string;
  optionUnderlying: string | null;
  optionType: "CALL" | "PUT" | null;
  optionStrike: string | null;
  optionExpiry: string | null;
  optionContractSize: number | null;
  direction: "LONG" | "SHORT";
  quantity: string;
  marketPrice: string;
  marketPriceCurrency: string;
  bookValueNative: string;
  bookValueNativeCurrency: string;
  bookValueCad: string;
  marketValueNative: string;
  marketValueNativeCurrency: string;
  unrealizedReturnNative: string;
  unrealizedReturnNativeCurrency: string;
};

/**
 * All positions for a snapshot, joined with account + instrument metadata.
 * Filtered to a single user for safety even though `snapshotId` already
 * disambiguates — defense in depth against bad call sites.
 */
/**
 * All positions across the user's latest snapshot that map to a given
 * symbol — across all accounts and (for options) all strikes/expiries on the
 * same underlying. Used to power the ticker detail page's "your position"
 * card.
 *
 * `symbol` may be the fully-qualified Yahoo identifier (e.g. "GOOG.NE",
 * "SHOP.TO", "BTC-USD") — we strip the venue suffix before matching against
 * the bare-ticker form stored on `positions.symbol` from the broker CSV.
 */
export async function getPositionsForSymbol(
  userId: string,
  symbol: string,
): Promise<HoldingRow[]> {
  const latest = await getLatestSnapshot(userId);
  if (!latest) return [];
  const all = await getHoldings(userId, latest.id);
  const up = symbol.toUpperCase();
  const bare = up.replace(/\.(NE|TO|V|TSX)$/, "").replace(/-USD$/, "");
  return all.filter(
    (h) =>
      h.symbol === up ||
      h.symbol === bare ||
      (h.securityType === "OPTION" && h.optionUnderlying === bare),
  );
}

export async function getHoldings(
  userId: string,
  snapshotId: number,
): Promise<HoldingRow[]> {
  const rows = await db()
    .select({
      positionId: schema.positions.id,
      accountId: schema.accounts.id,
      accountName: schema.accounts.name,
      accountClassification: schema.accounts.classification,
      instrumentId: schema.instruments.id,
      symbol: schema.instruments.symbol,
      exchange: schema.instruments.exchange,
      name: schema.instruments.name,
      securityType: schema.instruments.securityType,
      optionUnderlying: schema.instruments.optionUnderlying,
      optionType: schema.instruments.optionType,
      optionStrike: schema.instruments.optionStrike,
      optionExpiry: schema.instruments.optionExpiry,
      optionContractSize: schema.instruments.optionContractSize,
      direction: schema.positions.direction,
      quantity: schema.positions.quantity,
      marketPrice: schema.positions.marketPrice,
      marketPriceCurrency: schema.positions.marketPriceCurrency,
      bookValueNative: schema.positions.bookValueNative,
      bookValueNativeCurrency: schema.positions.bookValueNativeCurrency,
      bookValueCad: schema.positions.bookValueCad,
      marketValueNative: schema.positions.marketValueNative,
      marketValueNativeCurrency: schema.positions.marketValueNativeCurrency,
      unrealizedReturnNative: schema.positions.unrealizedReturnNative,
      unrealizedReturnNativeCurrency:
        schema.positions.unrealizedReturnNativeCurrency,
    })
    .from(schema.positions)
    .innerJoin(
      schema.accounts,
      eq(schema.positions.accountId, schema.accounts.id),
    )
    .innerJoin(
      schema.instruments,
      eq(schema.positions.instrumentId, schema.instruments.id),
    )
    .where(
      and(
        eq(schema.positions.userId, userId),
        eq(schema.positions.snapshotId, snapshotId),
      ),
    );
  return rows as HoldingRow[];
}
