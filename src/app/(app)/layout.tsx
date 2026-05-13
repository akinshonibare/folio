import { auth } from "@clerk/nextjs/server";
import { BottomNav } from "@/components/ui/BottomNav";
import { CurrencyProvider } from "@/components/CurrencyContext";
import { getUserSettings } from "@/lib/auth/session";
import { getFxRate } from "@/lib/fx/rates";

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
  if (userId) {
    const s = await getUserSettings(userId);
    if (s?.displayCurrency === "USD") displayCurrency = "USD";
  }
  let cadPerUsd = 1.4; // sane fallback if FX is unavailable
  try {
    cadPerUsd = await getFxRate("USD", "CAD");
  } catch {}

  return (
    <CurrencyProvider value={{ displayCurrency, cadPerUsd }}>
      <main className="app-main mx-auto max-w-3xl px-4 py-2 sm:py-4">
        {children}
      </main>
      <BottomNav />
    </CurrencyProvider>
  );
}
