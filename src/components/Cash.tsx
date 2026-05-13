"use client";

import { useStealth } from "./StealthContext";
import { formatCad, formatDeltaCad } from "@/lib/format";

/**
 * Renders a dollar amount. When stealth mode is on, the value is replaced by
 * dots of similar visual width so the layout doesn't jump.
 *
 * Always import this — never call `formatCad(...)` directly in user-facing
 * components. That's the invariant that keeps stealth mode comprehensive.
 */
export function Cash({
  amount,
  delta,
  cents,
  className,
}: {
  amount: number;
  delta?: boolean;
  cents?: boolean;
  className?: string;
}) {
  const { stealth } = useStealth();
  const display = delta
    ? formatDeltaCad(amount)
    : formatCad(amount, { cents });
  if (stealth) {
    return (
      <span className={`num ${className ?? ""}`} aria-label="hidden">
        {"•".repeat(Math.max(4, Math.min(display.length, 9)))}
      </span>
    );
  }
  return <span className={`num ${className ?? ""}`}>{display}</span>;
}
