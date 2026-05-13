import { auth } from "@clerk/nextjs/server";
import { BottomNav } from "@/components/ui/BottomNav";
import { CurrencyProvider } from "@/components/CurrencyContext";
import { getUserSettings } from "@/lib/auth/session";
import { getFxRate } from "@/lib/fx/rates";
import { getLatestSnapshot, getHoldings } from "@/lib/db/queries";
import { aggregate } from "@/lib/portfolio/aggregate";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Resolve display-currency preference + USD/CAD FX once per request, then
  // pass to a client-side context so every <Cash> renders in the right unit
  // without each page having to thread the value through.
  const { userId } = await auth();
  let displayCurrency: "CAD" | "USD" = "CAD";
  let totalCad: number | null = null;
  if (userId) {
    const s = await getUserSettings(userId);
    if (s?.displayCurrency === "USD") displayCurrency = "USD";
    // Cheap-enough lookup to power the profile-drawer "Total Worth" header.
    const snap = await getLatestSnapshot(userId);
    if (snap) {
      try {
        const holdings = await getHoldings(userId, snap.id);
        const summary = await aggregate(holdings);
        totalCad = summary.totalCad;
      } catch {
        totalCad = null;
      }
    }
  }
  let cadPerUsd = 1.37;
  try {
    cadPerUsd = await getFxRate("USD", "CAD");
  } catch {}

  return (
    <CurrencyProvider value={{ displayCurrency, cadPerUsd, totalCad }}>
      <main className="app-main mx-auto max-w-3xl px-4 py-2 sm:py-4 lg:max-w-6xl lg:px-8">
        {children}
      </main>
      <BottomNav />
    </CurrencyProvider>
  );
}
