"use client";

import { useState } from "react";
import { PillTabs } from "@/components/ui/PillTabs";

export type MarketsTab = "overview" | "crypto" | "stocks" | "funds" | "indices";
export type Region = "all" | "us" | "europe" | "apac";

export function MarketsTabs({
  initialTab = "overview",
  initialRegion = "all",
  onChange,
}: {
  initialTab?: MarketsTab;
  initialRegion?: Region;
  onChange?: (tab: MarketsTab, region: Region) => void;
}) {
  const [tab, setTab] = useState<MarketsTab>(initialTab);
  const [region, setRegion] = useState<Region>(initialRegion);
  return (
    <div className="space-y-3">
      <PillTabs
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "crypto", label: "Crypto" },
          { id: "stocks", label: "Stocks" },
          { id: "funds", label: "Funds" },
          { id: "indices", label: "Indices" },
        ]}
        value={tab}
        onChange={(v) => {
          setTab(v);
          onChange?.(v, region);
        }}
      />
      <PillTabs
        size="sm"
        tabs={[
          { id: "all", label: "All" },
          { id: "us", label: "US" },
          { id: "europe", label: "Europe" },
          { id: "apac", label: "APAC" },
        ]}
        value={region}
        onChange={(v) => {
          setRegion(v);
          onChange?.(tab, v);
        }}
      />
    </div>
  );
}
