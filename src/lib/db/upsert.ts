import { db, schema } from "@/lib/db/client";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { ParsedCsv, ParsedInstrument } from "@/lib/csv/parse";

export type UpsertResult = {
  snapshotId: number;
  duplicate: boolean;
  accountsTouched: number;
  positionsInserted: number;
};

/**
 * Idempotent ingest: a CSV with a hash we've already seen for this user is
 * a no-op (returns `duplicate: true`). Otherwise we insert a new snapshot,
 * upsert accounts and instruments, and insert position rows.
 *
 * Snapshots are immutable. Movement is computed at read time by joining
 * current snapshot against the most recent prior snapshot for the same user.
 */
export async function ingestCsv(
  userId: string,
  parsed: ParsedCsv,
): Promise<UpsertResult> {
  // Duplicate check
  const existing = await db()
    .select({ id: schema.snapshots.id })
    .from(schema.snapshots)
    .where(
      and(
        eq(schema.snapshots.userId, userId),
        eq(schema.snapshots.csvHash, parsed.csvHash),
      ),
    )
    .limit(1);
  if (existing[0]) {
    return {
      snapshotId: existing[0].id,
      duplicate: true,
      accountsTouched: 0,
      positionsInserted: 0,
    };
  }

  const [snap] = await db()
    .insert(schema.snapshots)
    .values({
      userId,
      asOf: parsed.asOf,
      csvHash: parsed.csvHash,
    })
    .returning({ id: schema.snapshots.id });

  // Upsert accounts keyed on (userId, accountKeyHash)
  const acctMap = new Map<string, number>(); // accountKeyHash -> accountId
  for (const p of parsed.positions) {
    if (acctMap.has(p.account.accountKeyHash)) continue;
    const a = p.account;
    const [row] = await db()
      .insert(schema.accounts)
      .values({
        userId,
        name: a.name,
        accountType: a.accountType,
        classification: a.classification,
        accountKeyHash: a.accountKeyHash,
      })
      .onConflictDoUpdate({
        target: [schema.accounts.userId, schema.accounts.accountKeyHash],
        set: {
          name: a.name,
          accountType: a.accountType,
          classification: a.classification,
        },
      })
      .returning({ id: schema.accounts.id });
    acctMap.set(a.accountKeyHash, row.id);
  }

  // Upsert instruments keyed on (symbol, exchange). For options, symbol is
  // the full OCC string; for crypto/equities, the ticker.
  const instrMap = new Map<string, number>(); // `${symbol}|${exchange}` -> id
  for (const p of parsed.positions) {
    const key = `${p.instrument.symbol}|${p.instrument.exchange}`;
    if (instrMap.has(key)) continue;
    const id = await upsertInstrument(p.instrument);
    instrMap.set(key, id);
  }

  // Insert positions
  let inserted = 0;
  for (const p of parsed.positions) {
    const accountId = acctMap.get(p.account.accountKeyHash)!;
    const instrumentId = instrMap.get(
      `${p.instrument.symbol}|${p.instrument.exchange}`,
    )!;
    await db()
      .insert(schema.positions)
      .values({
        snapshotId: snap.id,
        userId,
        accountId,
        instrumentId,
        direction: p.direction,
        quantity: p.quantity,
        marketPrice: p.marketPrice,
        marketPriceCurrency: p.marketPriceCurrency,
        bookValueNative: p.bookValueNative,
        bookValueNativeCurrency: p.bookValueNativeCurrency,
        bookValueCad: p.bookValueCad,
        marketValueNative: p.marketValueNative,
        marketValueNativeCurrency: p.marketValueNativeCurrency,
        unrealizedReturnNative: p.unrealizedReturnNative,
        unrealizedReturnNativeCurrency: p.unrealizedReturnNativeCurrency,
      });
    inserted++;
  }

  // Auto-graduate watchlist: any instrument we just inserted positions for
  // and which is on this user's watchlist gets `graduated = true`.
  const heldInstrumentIds = Array.from(instrMap.values());
  if (heldInstrumentIds.length) {
    await db()
      .update(schema.watchlist)
      .set({ graduated: true })
      .where(
        and(
          eq(schema.watchlist.userId, userId),
          inArray(schema.watchlist.instrumentId, heldInstrumentIds),
        ),
      );
  }

  return {
    snapshotId: snap.id,
    duplicate: false,
    accountsTouched: acctMap.size,
    positionsInserted: inserted,
  };
}

async function upsertInstrument(i: ParsedInstrument): Promise<number> {
  const [row] = await db()
    .insert(schema.instruments)
    .values({
      securityType: i.securityType,
      symbol: i.symbol,
      exchange: i.exchange,
      mic: i.mic,
      name: i.name,
      optionUnderlying: i.option?.underlying ?? null,
      optionType: i.option?.optionType ?? null,
      optionStrike: i.option ? i.option.strike.toString() : null,
      optionExpiry: i.option?.expiry ?? null,
      optionContractSize: i.option ? 100 : null,
    })
    .onConflictDoUpdate({
      target: [schema.instruments.symbol, schema.instruments.exchange],
      set: {
        name: sql`coalesce(${schema.instruments.name}, excluded.name)`,
      },
    })
    .returning({ id: schema.instruments.id });
  return row.id;
}
