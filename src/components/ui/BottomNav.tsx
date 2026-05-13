"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, TrendingUp, Briefcase, Cloud, Star } from "lucide-react";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/home", label: "Home", Icon: Home },
  { href: "/markets", label: "Markets", Icon: TrendingUp },
  { href: "/portfolio", label: "Portfolio", Icon: Briefcase },
  { href: "/insights", label: "Insights", Icon: Cloud },
  { href: "/following", label: "Following", Icon: Star },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-3 z-30 flex justify-center px-3 sm:bottom-6">
      <div
        className="pointer-events-auto flex items-center gap-1 rounded-full border border-[color:var(--color-border-2)] bg-[color:var(--color-surface)]/95 px-2 py-1.5 shadow-2xl backdrop-blur"
        style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}
      >
        {TABS.map(({ href, label, Icon }) => {
          const active =
            path === href || (href !== "/home" && path.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-w-[58px] flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-[11px] transition",
                active
                  ? "bg-[color:var(--color-surface-3)] text-[color:var(--color-fg)]"
                  : "text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]",
              )}
            >
              <Icon size={18} strokeWidth={active ? 2.3 : 1.8} />
              <span className="font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
