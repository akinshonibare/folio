"use client";

import { cn } from "@/lib/cn";

export function PillTabs<T extends string>({
  tabs,
  value,
  onChange,
  size = "md",
}: {
  tabs: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="h-scroll">
      {tabs.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={cn(
              "rounded-full font-medium transition",
              size === "sm"
                ? "px-3 py-1.5 text-xs"
                : "px-4 py-2 text-sm",
              active
                ? "bg-white text-black"
                : "bg-[color:var(--color-surface-2)] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
