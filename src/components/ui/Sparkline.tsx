/**
 * Tiny SVG sparkline — no Recharts, no client-only deps. Renders the path
 * inline so it streams with server HTML.
 */
export function Sparkline({
  values,
  width = 120,
  height = 36,
  tone = "neutral",
  showZero = true,
}: {
  values: number[];
  width?: number;
  height?: number;
  tone?: "positive" | "negative" | "neutral";
  showZero?: boolean;
}) {
  if (values.length < 2) {
    return <div style={{ width, height }} />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stroke =
    tone === "positive"
      ? "var(--color-positive)"
      : tone === "negative"
      ? "var(--color-negative)"
      : "var(--color-fg-muted)";
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      {showZero && (
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke={stroke}
          strokeOpacity={0.25}
          strokeDasharray="2 3"
        />
      )}
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
