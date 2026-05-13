import Link from "next/link";
import { ensureUserRow } from "@/lib/auth/session";
import {
  getLatestSnapshot,
  getPreviousSnapshot,
  getHoldings,
  getAllSnapshots,
} from "@/lib/db/queries";
import { aggregate, computeMovement } from "@/lib/portfolio/aggregate";
import { getFxRate } from "@/lib/fx/rates";
import { TopBar } from "@/components/ui/TopBar";
import { Section } from "@/components/ui/Section";
import { PortfolioHero } from "@/components/portfolio/PortfolioHero";
import { HoldingsList } from "@/components/portfolio/HoldingsList";
import { OptionsPanel } from "@/components/OptionsPanel";
import { AllocationDonut } from "@/components/AllocationDonut";
import { ValueChart, type ValuePoint } from "@/components/ValueChart";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const userId = await ensureUserRow();
  const snap = await getLatestSnapshot(userId);
  if (!snap) {
    return (
      <>
        <TopBar title="Portfolio" />
        <div className="card mt-6 p-6 text-center">
          <p className="font-semibold">No snapshots yet</p>
          <p className="mt-1 text-sm text-[color:var(--color-fg-muted)]">
            Upload your first CSV to populate your portfolio.
          </p>
          <Link href="/upload" className="btn-accent mt-4 inline-flex">
            Upload CSV
          </Link>
        </div>
      </>
    );
  }

  const [holdings, prevSnap] = await Promise.all([
    getHoldings(userId, snap.id),
    getPreviousSnapshot(userId, snap.id),
  ]);
  const prevHoldings = prevSnap ? await getHoldings(userId, prevSnap.id) : [];

  const currencies = new Set<string>();
  for (const h of holdings) currencies.add(h.marketValueNativeCurrency);
  const fxEntries = await Promise.all(
    Array.from(currencies).map(async (ccy) => {
      try {
        return [ccy, await getFxRate(ccy, "CAD")] as const;
      } catch {
        return [ccy, ccy === "CAD" ? 1 : NaN] as const;
      }
    }),
  );
  const fxRates = Object.fromEntries(fxEntries);

  const [summary, movement, valueSeries] = await Promise.all([
    aggregate(holdings),
    prevHoldings.length
      ? computeMovement(holdings, prevHoldings)
      : Promise.resolve([]),
    buildValueSeries(userId),
  ]);

  const dayDelta = movement.length
    ? movement.reduce((s, m) => s + m.deltaCad, 0)
    : null;
  const prevTotal = prevHoldings.length
    ? movement.reduce((s, m) => s + m.previousValueCad, 0)
    : 0;
  const dayDeltaPct =
    dayDelta != null && prevTotal > 0 ? (dayDelta / prevTotal) * 100 : null;

  return (
    <>
      <TopBar title="Portfolio" />
      <div className="space-y-6 pt-2">
        <PortfolioHero
          totalCad={summary.totalCad}
          totalReturnCad={summary.totalReturnCad}
          totalReturnPct={summary.totalReturnPct}
          dayDelta={dayDelta}
          dayDeltaPct={dayDeltaPct}
          asOf={new Date(snap.asOf)}
          optionsCad={summary.optionsExposureCad}
          cryptoCad={summary.cryptoExposureCad}
        />

        <Section subhead="Looking back" title="Performance">
          <ValueChart data={valueSeries} />
        </Section>

        <Section subhead="What you hold" title="Holdings">
          <HoldingsList holdings={holdings} fxRates={fxRates} />
        </Section>

        <Section subhead="By account" title="Allocation">
          <AllocationDonut byClassification={summary.byAccount} />
        </Section>

        <Section subhead="Active contracts" title="Options">
          <OptionsPanel holdings={holdings} fxRates={fxRates} />
        </Section>
      </div>
    </>
  );
}

async function buildValueSeries(userId: string): Promise<ValuePoint[]> {
  const snaps = await getAllSnapshots(userId);
  if (snaps.length === 0) return [];
  const fxCache = new Map<string, number>();
  async function fx(ccy: string): Promise<number> {
    if (fxCache.has(ccy)) return fxCache.get(ccy)!;
    try {
      const r = await getFxRate(ccy, "CAD");
      fxCache.set(ccy, r);
      return r;
    } catch {
      const fallback = ccy === "CAD" ? 1 : NaN;
      fxCache.set(ccy, fallback);
      return fallback;
    }
  }
  const series: ValuePoint[] = [];
  for (const s of snaps) {
    const rows = await getHoldings(userId, s.id);
    let total = 0;
    for (const r of rows) {
      const rate = await fx(r.marketValueNativeCurrency);
      if (Number.isFinite(rate)) {
        total += parseFloat(r.marketValueNative) * rate;
      }
    }
    series.push({
      date: new Date(s.asOf).toISOString().slice(0, 10),
      valueCad: total,
    });
  }
  return series;
}
