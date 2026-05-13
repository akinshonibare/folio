/**
 * Money + percent formatters. Always tabular-num friendly.
 */

const cadFmt = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

const cadFmtCents = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 2,
});

const usdFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const usdFmtCents = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export function formatCad(amount: number, opts?: { cents?: boolean }): string {
  if (!Number.isFinite(amount)) return "—";
  return opts?.cents ? cadFmtCents.format(amount) : cadFmt.format(amount);
}

export function formatUsd(amount: number, opts?: { cents?: boolean }): string {
  if (!Number.isFinite(amount)) return "—";
  return opts?.cents ? usdFmtCents.format(amount) : usdFmt.format(amount);
}

export function formatMoney(
  amount: number,
  currency: "CAD" | "USD",
  opts?: { cents?: boolean },
): string {
  return currency === "USD"
    ? formatUsd(amount, opts)
    : formatCad(amount, opts);
}

export function formatDeltaMoney(
  amount: number,
  currency: "CAD" | "USD",
): string {
  if (!Number.isFinite(amount)) return "—";
  const fmt = currency === "USD" ? usdFmtCents : cadFmtCents;
  const sign = amount > 0 ? "+" : amount < 0 ? "−" : "";
  return `${sign}${fmt.format(Math.abs(amount))}`;
}

export function formatPct(pct: number, opts?: { sign?: boolean }): string {
  if (!Number.isFinite(pct)) return "—";
  const s = `${pct.toFixed(2)}%`;
  if (opts?.sign && pct > 0) return `+${s}`;
  return s;
}

export function formatDeltaCad(amount: number): string {
  if (!Number.isFinite(amount)) return "—";
  const sign = amount > 0 ? "+" : amount < 0 ? "−" : "";
  return `${sign}${cadFmtCents.format(Math.abs(amount))}`;
}

export function formatQuantity(qty: string | number): string {
  const n = typeof qty === "string" ? parseFloat(qty) : qty;
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1000) return n.toFixed(0);
  if (Math.abs(n) >= 1) return n.toFixed(2);
  return n.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

export function daysUntil(dateIso: string): number {
  const ms = new Date(dateIso + "T16:00:00Z").getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}
