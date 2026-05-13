/**
 * Delta-style circular ticker logo. For phase 1 we don't host logo art —
 * render a colour-cycled monogram derived from the ticker. Pleasant on dark
 * backgrounds, stable across renders.
 */
const PALETTE = [
  ["#7AC8FA", "#0B2438"], // blue
  ["#10E060", "#0E2818"], // green
  ["#FF7A45", "#2E120B"], // orange
  ["#9F7AFA", "#1F1530"], // purple
  ["#F2C94C", "#2A1F08"], // gold
  ["#FF3D6E", "#2F0B17"], // pink-red
  ["#4DD4D4", "#082626"], // teal
  ["#B4B8C5", "#1E2026"], // grey
];

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function TickerIcon({
  symbol,
  size = 40,
}: {
  symbol: string;
  size?: number;
}) {
  const clean = (symbol || "?").trim().toUpperCase();
  const idx = hashCode(clean) % PALETTE.length;
  const [fg, bg] = PALETTE[idx];
  const label = clean.length <= 3 ? clean : clean.slice(0, 3);
  const fontSize = Math.round(size * 0.36);
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-bold"
      style={{
        width: size,
        height: size,
        background: bg,
        color: fg,
        fontSize,
        letterSpacing: "-0.02em",
        fontFamily: "var(--font-display)",
      }}
      aria-hidden
    >
      {label}
    </span>
  );
}
