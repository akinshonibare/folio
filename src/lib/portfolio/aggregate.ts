import type { HoldingRow } from "@/lib/db/queries";
import { getFxRate } from "@/lib/fx/rates";

export type PortfolioSummary = {
  totalCad: number;
  totalCostCad: number;
  totalReturnCad: number;
  totalReturnPct: number;
  byAccount: Record<string, { value: number; cost: number; returnPct: number }>;
  bySecurityType: Record<string, number>; // value in CAD
  optionsExposureCad: number;
  cryptoExposureCad: number;
};

/**
 * Aggregate a holdings snapshot into the hero numbers.
 *
 * Conversion rules:
 *   - bookValueCad is already provided by the broker; sum directly.
 *   - marketValueNative needs FX → CAD.
 *   - options' marketValueNative from Wealthsimple is contracts × 100 × premium
 *     (broker already multiplies); use as-is.
 */
export async function aggregate(rows: HoldingRow[]): Promise<PortfolioSummary> {
  const currenciesNeeded = new Set<string>();
  for (const r of rows) currenciesNeeded.add(r.marketValueNativeCurrency);
  const rates = new Map<string, number>();
  await Promise.all(
    Array.from(currenciesNeeded).map(async (ccy) => {
      try {
        rates.set(ccy, await getFxRate(ccy, "CAD"));
      } catch {
        // If FX lookup fails (offline, rate-limited), assume parity for
        // already-CAD positions; everything else just goes in at native value.
        rates.set(ccy, ccy === "CAD" ? 1 : NaN);
      }
    }),
  );

  let totalCad = 0;
  let totalCostCad = 0;
  let optionsExposureCad = 0;
  let cryptoExposureCad = 0;
  const byAccount = new Map<
    string,
    { value: number; cost: number; returnPct: number }
  >();
  const bySecurityType = new Map<string, number>();

  for (const r of rows) {
    const fx = rates.get(r.marketValueNativeCurrency) ?? NaN;
    const mvCad = Number.isFinite(fx) ? parseFloat(r.marketValueNative) * fx : 0;
    const costCad = parseFloat(r.bookValueCad);

    totalCad += mvCad;
    totalCostCad += costCad;
    if (r.securityType === "OPTION") optionsExposureCad += mvCad;
    if (r.securityType === "CRYPTOCURRENCY") cryptoExposureCad += mvCad;

    const acctKey = r.accountClassification;
    const acct = byAccount.get(acctKey) ?? {
      value: 0,
      cost: 0,
      returnPct: 0,
    };
    acct.value += mvCad;
    acct.cost += costCad;
    byAccount.set(acctKey, acct);

    bySecurityType.set(
      r.securityType,
      (bySecurityType.get(r.securityType) ?? 0) + mvCad,
    );
  }

  for (const a of byAccount.values()) {
    a.returnPct = a.cost > 0 ? ((a.value - a.cost) / a.cost) * 100 : 0;
  }

  return {
    totalCad,
    totalCostCad,
    totalReturnCad: totalCad - totalCostCad,
    totalReturnPct:
      totalCostCad > 0 ? ((totalCad - totalCostCad) / totalCostCad) * 100 : 0,
    byAccount: Object.fromEntries(byAccount),
    bySecurityType: Object.fromEntries(bySecurityType),
    optionsExposureCad,
    cryptoExposureCad,
  };
}

export type MovementRow = {
  instrumentId: number;
  symbol: string;
  name: string | null;
  securityType: string;
  account: string;
  currentValueCad: number;
  previousValueCad: number;
  deltaCad: number;
  deltaPct: number;
};

/**
 * Per-instrument delta between current snapshot and the previous one.
 * Positions present in only one snapshot show up as added/removed (caller
 * handles the messaging).
 */
export async function computeMovement(
  current: HoldingRow[],
  previous: HoldingRow[],
): Promise<MovementRow[]> {
  const currencies = new Set<string>();
  for (const r of [...current, ...previous]) {
    currencies.add(r.marketValueNativeCurrency);
  }
  const rates = new Map<string, number>();
  await Promise.all(
    Array.from(currencies).map(async (ccy) => {
      try {
        rates.set(ccy, await getFxRate(ccy, "CAD"));
      } catch {
        rates.set(ccy, ccy === "CAD" ? 1 : NaN);
      }
    }),
  );
  const cad = (r: HoldingRow) => {
    const fx = rates.get(r.marketValueNativeCurrency) ?? NaN;
    return Number.isFinite(fx) ? parseFloat(r.marketValueNative) * fx : 0;
  };

  // Group by instrument + account so options across accounts stay distinct.
  const key = (r: HoldingRow) => `${r.instrumentId}:${r.accountId}`;
  const prev = new Map(previous.map((r) => [key(r), r]));

  const out: MovementRow[] = [];
  for (const r of current) {
    const p = prev.get(key(r));
    const currentValueCad = cad(r);
    const previousValueCad = p ? cad(p) : 0;
    const deltaCad = currentValueCad - previousValueCad;
    const deltaPct =
      previousValueCad > 0 ? (deltaCad / previousValueCad) * 100 : 0;
    out.push({
      instrumentId: r.instrumentId,
      symbol: r.symbol,
      name: r.name,
      securityType: r.securityType,
      account: r.accountName,
      currentValueCad,
      previousValueCad,
      deltaCad,
      deltaPct,
    });
  }
  return out.sort((a, b) => Math.abs(b.deltaCad) - Math.abs(a.deltaCad));
}
