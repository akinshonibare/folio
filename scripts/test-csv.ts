/**
 * Smoke test: parse the real 2026-05-12 Wealthsimple holdings export and
 * print a summary. Catches regressions in the OCC option parser and the
 * account classifier.
 *
 *   pnpm test:csv
 */

import fs from "node:fs";
import path from "node:path";
import { parseWealthsimpleCsv } from "../src/lib/csv/parse";

const SAMPLE = path.resolve(
  process.env.HOME!,
  "Downloads/holdings csv/holdings-report-2026-05-12.csv",
);

if (!fs.existsSync(SAMPLE)) {
  console.error(`Sample CSV not found at ${SAMPLE}`);
  process.exit(1);
}

const text = fs.readFileSync(SAMPLE, "utf8");
const parsed = parseWealthsimpleCsv(text);

console.log("as of:", parsed.asOf.toISOString());
console.log("csv hash:", parsed.csvHash.slice(0, 12) + "...");
console.log("positions:", parsed.positions.length);

const byType = new Map<string, number>();
for (const p of parsed.positions) {
  byType.set(
    p.instrument.securityType,
    (byType.get(p.instrument.securityType) || 0) + 1,
  );
}
console.log("by type:", Object.fromEntries(byType));

const byAcct = new Map<string, number>();
for (const p of parsed.positions) {
  const k = `${p.account.classification}:${p.account.name}`;
  byAcct.set(k, (byAcct.get(k) || 0) + 1);
}
console.log("by account:", Object.fromEntries(byAcct));

console.log("\noptions parsed:");
const options = parsed.positions.filter((p) => p.instrument.option);
for (const p of options) {
  const o = p.instrument.option!;
  console.log(
    `  ${p.instrument.symbol.padEnd(22)} -> ${o.underlying.padEnd(6)} ${o.optionType.padEnd(4)} exp ${o.expiry} strike $${o.strike}`,
  );
}

const broken = parsed.positions.filter(
  (p) => p.instrument.securityType === "OPTION" && !p.instrument.option,
);
if (broken.length) {
  console.log("\nBROKEN option rows (parser couldn't decode):");
  for (const p of broken) console.log("  " + p.instrument.symbol);
  process.exit(1);
}
