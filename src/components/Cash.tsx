"use client";

import { useStealth } from "./StealthContext";
import { useCurrency, toDisplay } from "./CurrencyContext";
import { formatMoney, formatDeltaMoney } from "@/lib/format";

/**
 * Renders a CAD-denominated amount in the user's display currency
 * (CAD or USD). Stealth mode masks the value to dots.
 *
 * Always import this — never call `formatCad(...)` directly in user-facing
 * components. This is the funnel for both stealth mode AND currency display.
 */
export function Cash({
  amount,
  delta,
  cents,
  className,
}: {
  /** CAD-denominated amount (the canonical internal unit). */
  amount: number;
  delta?: boolean;
  cents?: boolean;
  className?: string;
}) {
  const { stealth } = useStealth();
  const ctx = useCurrency();
  const converted = toDisplay(amount, ctx);
  const display = delta
    ? formatDeltaMoney(converted, ctx.displayCurrency)
    : formatMoney(converted, ctx.displayCurrency, { cents });
  if (stealth) {
    return (
      <span className={`num ${className ?? ""}`} aria-label="hidden">
        {"•".repeat(Math.max(4, Math.min(display.length, 9)))}
      </span>
    );
  }
  return <span className={`num ${className ?? ""}`}>{display}</span>;
}
