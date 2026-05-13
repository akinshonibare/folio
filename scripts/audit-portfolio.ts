/**
 * Diagnostic: dump the user's latest snapshot from the DB, compare against
 * the raw CSV file in ~/Downloads, and surface any positions that look like
 * they were dropped, mis-summed, or got the wrong FX rate.
 *
 *   pnpm tsx scripts/audit-portfolio.ts
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import fs from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { parseWealthsimpleCsv } from "../src/lib/csv/parse";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  // Latest snapshot for any user (we have one user)
  const snaps = await sql`
    select id, user_id, as_of from snapshots order by as_of desc limit 1
  `;
  if (snaps.length === 0) {
    console.error("No snapshots in DB");
    process.exit(1);
  }
  const snap = snaps[0];
  console.log(`Snapshot id=${snap.id}, as_of=${snap.as_of}`);

  const positions = await sql`
    select p.id, p.quantity, p.market_price, p.market_price_currency,
           p.market_value_native, p.market_value_native_currency,
           p.book_value_cad,
           i.symbol, i.exchange, i.security_type, a.classification
      from positions p
      join instruments i on i.id = p.instrument_id
      join accounts a on a.id = p.account_id
     where p.snapshot_id = ${snap.id}
     order by a.classification, i.symbol
  `;
  console.log(`DB positions: ${positions.length}`);

  // Pull CSV for comparison
  const SAMPLE = path.resolve(
    process.env.HOME!,
    "Downloads/holdings csv/holdings-report-2026-05-12.csv",
  );
  const csvText = fs.readFileSync(SAMPLE, "utf8");
  const parsed = parseWealthsimpleCsv(csvText);
  console.log(`CSV positions: ${parsed.positions.length}`);

  // Fetch live USD/CAD rate (one call). yahoo-finance2 v3 requires a constructor.
  const { default: YahooFinance } = await import("yahoo-finance2");
  const yf = new YahooFinance();
  const fxQuote = (await yf.quote("USDCAD=X")) as {
    regularMarketPrice?: number;
  };
  const usdCad = fxQuote.regularMarketPrice ?? NaN;
  console.log(`USD/CAD live rate: ${usdCad}`);

  // Compute total CAD from DB rows
  let dbTotalCad = 0;
  const byAccount = new Map<string, number>();
  const byType = new Map<string, number>();
  for (const p of positions) {
    const ccy = p.market_value_native_currency;
    const fx = ccy === "CAD" ? 1 : ccy === "USD" ? usdCad : NaN;
    const mv = parseFloat(p.market_value_native);
    const cad = Number.isFinite(fx) ? mv * fx : 0;
    dbTotalCad += cad;
    byAccount.set(
      p.classification,
      (byAccount.get(p.classification) ?? 0) + cad,
    );
    byType.set(p.security_type, (byType.get(p.security_type) ?? 0) + cad);
  }
  console.log(`\nDB total CAD: ${dbTotalCad.toFixed(2)}`);
  console.log("\nDB by account:");
  for (const [k, v] of byAccount) console.log(`  ${k.padEnd(8)} ${v.toFixed(2)}`);
  console.log("\nDB by type:");
  for (const [k, v] of byType) console.log(`  ${k.padEnd(22)} ${v.toFixed(2)}`);

  // Compute total CAD from CSV
  let csvTotalCad = 0;
  for (const p of parsed.positions) {
    const ccy = p.marketValueNativeCurrency;
    const fx = ccy === "CAD" ? 1 : ccy === "USD" ? usdCad : NaN;
    const mv = parseFloat(p.marketValueNative);
    csvTotalCad += Number.isFinite(fx) ? mv * fx : 0;
  }
  console.log(`\nCSV total CAD: ${csvTotalCad.toFixed(2)}`);
  console.log(
    `\nDiff (CSV − DB): ${(csvTotalCad - dbTotalCad).toFixed(2)} CAD`,
  );

  // Look for positions in CSV missing from DB
  const dbKey = (p: { symbol: string; classification: string }) =>
    `${p.classification}:${p.symbol}`;
  const dbKeys = new Set(positions.map((p) => dbKey(p as { symbol: string; classification: string })));
  const csvKeys = new Set(
    parsed.positions.map((p) =>
      `${p.account.classification}:${p.instrument.symbol}`,
    ),
  );
  for (const k of csvKeys) if (!dbKeys.has(k)) console.log(`MISSING IN DB: ${k}`);
  for (const k of dbKeys) if (!csvKeys.has(k)) console.log(`EXTRA IN DB: ${k}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
