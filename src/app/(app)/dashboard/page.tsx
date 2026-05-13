import Link from "next/link";
import { ensureUserRow } from "@/lib/auth/session";
import {
  getLatestSnapshot,
  getPreviousSnapshot,
  getHoldings,
} from "@/lib/db/queries";
import { aggregate, computeMovement } from "@/lib/portfolio/aggregate";
import { getFxRate } from "@/lib/fx/rates";
import { PortfolioSummaryCards } from "@/components/PortfolioSummary";
import { HoldingsTable } from "@/components/HoldingsTable";
import { OptionsPanel } from "@/components/OptionsPanel";
import { AllocationDonut } from "@/components/AllocationDonut";
import { Movers } from "@/components/Movers";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const userId = await ensureUserRow();
  const snap = await getLatestSnapshot(userId);
  if (!snap) return <EmptyState />;

  const [holdings, prevSnap] = await Promise.all([
    getHoldings(userId, snap.id),
    getPreviousSnapshot(userId, snap.id),
  ]);
  const prevHoldings = prevSnap ? await getHoldings(userId, prevSnap.id) : [];

  // Gather FX rates the components need (client-side conversions stay simple).
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

  const [summary, movement] = await Promise.all([
    aggregate(holdings),
    prevHoldings.length ? computeMovement(holdings, prevHoldings) : Promise.resolve([]),
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
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)]">
            Snapshot
          </p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
            {new Date(snap.asOf).toLocaleString("en-CA", {
              dateStyle: "long",
              timeStyle: "short",
            })}
          </h1>
        </div>
      </div>

      <PortfolioSummaryCards
        summary={summary}
        dayDelta={dayDelta}
        dayDeltaPct={dayDeltaPct}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <HoldingsTable holdings={holdings} fxRates={fxRates} />
        </div>
        <div className="space-y-6">
          <AllocationDonut byClassification={summary.byAccount} />
          <Movers rows={movement} />
        </div>
      </div>

      <OptionsPanel holdings={holdings} fxRates={fxRates} />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card mx-auto max-w-md p-8 text-center">
      <h2 className="text-xl font-semibold">Welcome to folio</h2>
      <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
        Upload your first Wealthsimple holdings CSV to get going.
      </p>
      <Link
        href="/upload"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-[color:var(--color-accent)] px-4 py-2 text-sm font-medium text-[color:var(--color-accent-fg)]"
      >
        Upload CSV
      </Link>
    </div>
  );
}
