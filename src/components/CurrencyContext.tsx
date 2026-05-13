"use client";

import { createContext, useContext } from "react";

export type DisplayCurrency = "CAD" | "USD";

type Ctx = {
  /** What currency the user wants to see roll-up totals in. */
  displayCurrency: DisplayCurrency;
  /** Live FX: 1 USD = cadPerUsd CAD. Used to convert stored CAD totals to USD
   *  on the client at render time. */
  cadPerUsd: number;
  /** Current portfolio total in CAD, computed server-side once per request
   *  and exposed to client components (e.g. the profile drawer) without
   *  needing a round-trip. Null when the user has no snapshots yet. */
  totalCad: number | null;
};

const CurrencyCtx = createContext<Ctx>({
  displayCurrency: "CAD",
  cadPerUsd: 1,
  totalCad: null,
});

export function CurrencyProvider({
  value,
  children,
}: {
  value: Ctx;
  children: React.ReactNode;
}) {
  return <CurrencyCtx.Provider value={value}>{children}</CurrencyCtx.Provider>;
}

export function useCurrency() {
  return useContext(CurrencyCtx);
}

/**
 * Convert a CAD-denominated amount to the user's display currency.
 * Returns Infinity-safe value.
 */
export function toDisplay(amountCad: number, ctx: Ctx): number {
  if (!Number.isFinite(amountCad)) return amountCad;
  if (ctx.displayCurrency === "CAD") return amountCad;
  if (!ctx.cadPerUsd || !Number.isFinite(ctx.cadPerUsd)) return amountCad;
  return amountCad / ctx.cadPerUsd;
}
