"use client";

import { useState } from "react";
import { PillTabs } from "@/components/ui/PillTabs";
import { ArrowUpDown } from "lucide-react";

export function FollowingFilters() {
  const [kind, setKind] = useState<
    "all" | "crypto" | "stocks" | "funds" | "commodities" | "indices"
  >("all");
  const [period, setPeriod] = useState<"1H" | "1D" | "1W">("1D");
  return (
    <div className="space-y-3">
      <PillTabs
        size="sm"
        tabs={[
          { id: "all", label: "All" },
          { id: "crypto", label: "Crypto" },
          { id: "stocks", label: "Stocks" },
          { id: "funds", label: "Funds" },
          { id: "commodities", label: "Commodities" },
          { id: "indices", label: "Indices" },
        ]}
        value={kind}
        onChange={(v) =>
          setKind(
            v as "all" | "crypto" | "stocks" | "funds" | "commodities" | "indices",
          )
        }
      />
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="flex items-center gap-2 rounded-full bg-[color:var(--color-surface-2)] px-3 py-1.5 text-xs text-[color:var(--color-fg-muted)]"
        >
          <ArrowUpDown size={12} />
          <span>Highest Cap</span>
        </button>
        <PillTabs
          size="sm"
          tabs={[
            { id: "1H", label: "1H" },
            { id: "1D", label: "1D" },
            { id: "1W", label: "1W" },
          ]}
          value={period}
          onChange={(v) => setPeriod(v as "1H" | "1D" | "1W")}
        />
      </div>
    </div>
  );
}
