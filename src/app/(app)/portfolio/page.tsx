import Link from "next/link";
import { ensureUserRow } from "@/lib/auth/session";
import {
  getLatestSnapshot,
  getHoldings,
  getAllSnapshots,
} from "@/lib/db/queries";
import { buildLivePortfolio } from "@/lib/portfolio/live";
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
          <p className="font-semibold">No positions yet</p>
          <p className="mt-1 text-sm text-[color:var(--color-fg-muted)]">
            Upload a Wealthsimple holdings CSV to tell folio what you own.
            After that, the dashboard shows live market value daily — you only
            need to re-upload when you buy or sell.
          </p>
          <Link href="/upload" className="btn-accent mt-4 inline-flex">
            Upload CSV
          </Link>
        </div>
      </>
    );
  }

  const holdings = await getHoldings(userId, snap.id);
  const [live, valueSeries] = await Promise.all([
    buildLivePortfolio(holdings),
    buildValueSeries(userId),
  ]);
  // Key by positionId so duplicate-instrument rows (e.g. VFV in both RRSP
  // and TFSA) each get their own valuation.
  const liveByPosition = new Map(live.positions.map((p) => [p.positionId, p]));

  return (
    <>
      <TopBar title="Portfolio" />
      <div className="space-y-6 pt-2">
        <PortfolioHero
          totalCad={live.totalCad}
          totalReturnCad={live.totalReturnCad}
          totalReturnPct={live.totalReturnPct}
          dayDelta={live.dayDeltaCad}
          dayDeltaPct={live.dayDeltaPct}
          asOf={live.asOf ?? new Date(snap.asOf)}
          asOfMode={live.asOf ? "live" : "snapshot"}
          optionsCad={live.optionsCad}
          cryptoCad={live.cryptoCad}
        />

        <Section subhead="Looking back" title="Performance">
          <ValueChart data={valueSeries} />
        </Section>

        <Section subhead="What you hold" title="Holdings">
          <HoldingsList
            holdings={holdings}
            liveByPosition={liveByPosition}
          />
        </Section>

        <Section subhead="By account" title="Allocation">
          <AllocationDonut byClassification={live.byAccount} />
        </Section>

        <Section subhead="Active contracts" title="Options">
          <OptionsPanel
            holdings={holdings}
            liveByPosition={liveByPosition}
          />
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
