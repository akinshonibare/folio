"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

/**
 * Triggers a server-side Polygon refresh of every option position. Free tier
 * is 5 req/min, so 16 options take ~3 minutes — we surface a stage so the
 * button doesn't look dead.
 */
export function OptionsRefreshButton() {
  const [stage, setStage] = useState<
    "idle" | "running" | "done" | "error"
  >("idle");
  const [result, setResult] = useState<{
    refreshed: number;
    skipped: number;
  } | null>(null);
  const router = useRouter();

  async function refresh() {
    setStage("running");
    setResult(null);
    try {
      const res = await fetch("/api/quotes/options/refresh", {
        method: "POST",
      });
      const j = await res.json();
      if (!res.ok) {
        setStage("error");
        return;
      }
      setResult({
        refreshed: j.refreshed ?? 0,
        skipped: j.skipped ?? 0,
      });
      setStage("done");
      router.refresh();
    } catch {
      setStage("error");
    }
  }

  return (
    <button
      type="button"
      onClick={refresh}
      disabled={stage === "running"}
      className="flex items-center gap-1.5 rounded-full bg-[color:var(--color-surface-2)] px-3 py-1 text-[11px] text-[color:var(--color-fg-muted)] transition hover:text-[color:var(--color-fg)] disabled:opacity-60"
      title="Pull latest EOD option prices from Polygon (free tier: ~3 min for 16 options)"
    >
      <RefreshCw
        size={11}
        className={stage === "running" ? "animate-spin" : ""}
      />
      <span>
        {stage === "idle" && "Refresh prices"}
        {stage === "running" && "Fetching EOD…"}
        {stage === "done" &&
          (result
            ? `Updated ${result.refreshed}, kept ${result.skipped}`
            : "Done")}
        {stage === "error" && "Error — retry"}
      </span>
    </button>
  );
}
