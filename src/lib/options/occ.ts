/**
 * OCC option symbol parser.
 *
 * Format (21 chars): SSSSSSYYMMDDTPPPPPPPP
 *   SSSSSS  — underlying ticker, left-aligned, space-padded to 6 chars
 *   YYMMDD  — expiry date
 *   T       — 'C' (call) or 'P' (put)
 *   PPPPPPPP — strike × 1000, zero-padded to 8 digits
 *
 * Wealthsimple emits this as the `Symbol` column for OPTION rows, e.g.
 *   "SNDK  260529C02000000" -> SNDK call expiring 2026-05-29, strike $2000
 *   "AZN   260618C00210000" -> AZN  call expiring 2026-06-18, strike $210
 *
 * Adjusted options (post corporate action) can have non-standard strikes.
 * We parse what's there and let the caller verify.
 */

export type OccParsed = {
  occSymbol: string; // normalised 21-char OCC symbol, spaces preserved
  underlying: string; // e.g. "SNDK"
  expiry: string; // ISO date "YYYY-MM-DD"
  optionType: "CALL" | "PUT";
  strike: number; // dollars
};

const OCC_RE = /^([A-Z]{1,6})\s*(\d{6})([CP])(\d{8})$/;

export function parseOccSymbol(raw: string): OccParsed | null {
  if (!raw) return null;
  // OCC symbol normalisation: collapse internal whitespace runs to whatever
  // the regex tolerates, but DON'T strip the underlying's padding entirely —
  // we still want the regex to match a "SNDK  260529C..." input. Easiest:
  // remove ALL whitespace, then re-derive components.
  const compact = raw.replace(/\s+/g, "");
  // Now the compact form is e.g. "SNDK260529C02000000" — variable length on
  // the underlying. Last 15 chars are the date+type+strike. The remainder is
  // the underlying.
  if (compact.length < 16) return null;
  const tail = compact.slice(-15);
  const underlying = compact.slice(0, -15);
  const m = `${underlying}${tail}`.match(OCC_RE);
  if (!m) return null;
  const [, sym, yymmdd, t, strikeRaw] = m;
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  const mm = parseInt(yymmdd.slice(2, 4), 10);
  const dd = parseInt(yymmdd.slice(4, 6), 10);
  // OCC dates are post-2000.
  const fullYear = 2000 + yy;
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const expiry = `${fullYear.toString().padStart(4, "0")}-${mm
    .toString()
    .padStart(2, "0")}-${dd.toString().padStart(2, "0")}`;
  const strike = parseInt(strikeRaw, 10) / 1000;
  return {
    occSymbol: raw, // keep the exact form Wealthsimple emitted, for traceability
    underlying: sym,
    expiry,
    optionType: t === "C" ? "CALL" : "PUT",
    strike,
  };
}

/**
 * Compose a human-friendly display name for an option that has no Name field
 * in the CSV (Wealthsimple doesn't fill one for options).
 */
export function formatOptionName(parsed: OccParsed): string {
  const [, mm, dd] = parsed.expiry.split("-");
  const monthShort = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ][parseInt(mm, 10) - 1];
  const strikeStr =
    parsed.strike % 1 === 0
      ? parsed.strike.toFixed(0)
      : parsed.strike.toFixed(2);
  return `${parsed.underlying} ${monthShort} ${parseInt(
    dd,
    10,
  )} $${strikeStr} ${parsed.optionType === "CALL" ? "C" : "P"}`;
}
