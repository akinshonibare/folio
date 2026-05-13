"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

type Settings = {
  quoteProvider: "yahoo" | "polygon";
  displayCurrency: "CAD" | "USD";
  stealthDefault: boolean;
  shareDollarsInGroups: boolean;
};

export function SettingsForm({
  initial,
  polygonAvailable,
}: {
  initial: Settings;
  polygonAvailable: boolean;
}) {
  const [s, setS] = useState<Settings>(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [err, setErr] = useState<string | null>(null);

  async function save(patch: Partial<Settings>) {
    setStatus("saving");
    setErr(null);
    const next = { ...s, ...patch };
    setS(next);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setStatus("error");
      setErr(j.error ?? "Save failed");
      // Roll back on error
      setS(s);
      return;
    }
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 1200);
  }

  return (
    <div className="space-y-4">
      <Row
        title="Display currency"
        hint="What unit your portfolio rolls up to. Native price columns always show the local currency; this only affects totals."
      >
        <select
          value={s.displayCurrency}
          onChange={(e) => {
            const next = e.target.value as Settings["displayCurrency"];
            save({ displayCurrency: next });
            // Reload so the layout's currency context picks up the new value.
            setTimeout(() => window.location.reload(), 300);
          }}
          className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-3 py-2 text-sm"
        >
          <option value="CAD">CAD — Canadian dollar</option>
          <option value="USD">USD — US dollar</option>
        </select>
      </Row>
      <Row
        title="Quote provider"
        hint={
          polygonAvailable
            ? "Yahoo is free and the default. Polygon adds options pricing and Greeks (Phase 7)."
            : "Yahoo is the only provider on this deployment. Set POLYGON_API_KEY in the environment to enable the Polygon option."
        }
      >
        <select
          value={s.quoteProvider}
          onChange={(e) => save({ quoteProvider: e.target.value as Settings["quoteProvider"] })}
          className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-3 py-2 text-sm"
          disabled={!polygonAvailable}
        >
          <option value="yahoo">Yahoo Finance</option>
          {polygonAvailable && <option value="polygon">Polygon.io</option>}
        </select>
      </Row>
      <Row
        title="Stealth mode by default"
        hint="When on, dollar amounts are masked in this browser by default. The eye toggle in the header still works per-session."
      >
        <Toggle
          checked={s.stealthDefault}
          onChange={(v) => save({ stealthDefault: v })}
        />
      </Row>
      <Row
        title="Share dollars in friend groups"
        hint="When off (default), people in your groups see your tickers + quantities but not dollar amounts."
      >
        <Toggle
          checked={s.shareDollarsInGroups}
          onChange={(v) => save({ shareDollarsInGroups: v })}
        />
      </Row>
      <div className="text-xs text-[color:var(--color-fg-subtle)]">
        {status === "saving" && "Saving…"}
        {status === "saved" && "Saved."}
        {status === "error" && err && (
          <span className="text-[color:var(--color-negative)]">{err}</span>
        )}
      </div>

      <div className="mt-10">
        <p className="subhead">Danger zone</p>
        <h2 className="section-title mt-1">Reset</h2>
        <DangerReset />
      </div>
    </div>
  );
}

function DangerReset() {
  const [stage, setStage] = useState<"idle" | "confirming" | "deleting" | "done" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function doReset() {
    setStage("deleting");
    setErr(null);
    try {
      const res = await fetch("/api/portfolio/reset?confirm=DELETE", {
        method: "DELETE",
      });
      const j = await res.json();
      if (!res.ok) {
        setStage("error");
        setErr(j.error ?? "Reset failed");
        return;
      }
      setStage("done");
      setTimeout(() => router.push("/home"), 1200);
    } catch (e) {
      setStage("error");
      setErr(e instanceof Error ? e.message : "Reset failed");
    }
  }

  return (
    <div className="mt-3 rounded-2xl border border-[color:var(--color-negative)]/50 bg-[color:var(--color-negative-soft)] p-5">
      <h3 className="font-semibold">Reset portfolio</h3>
      <p className="mt-1 text-sm text-[color:var(--color-fg-muted)]">
        Delete every snapshot, position, account, and watchlist entry tied to
        your account. Your sign-in and settings stay. There's no undo — you'll
        need to re-upload a CSV afterward.
      </p>
      <div className="mt-4 flex items-center gap-2">
        {stage === "idle" && (
          <button
            type="button"
            onClick={() => setStage("confirming")}
            className="flex items-center gap-2 rounded-full bg-[color:var(--color-negative)]/15 px-4 py-2 text-sm font-semibold text-[color:var(--color-negative)] hover:bg-[color:var(--color-negative)]/25"
          >
            <Trash2 size={14} />
            Reset all data
          </button>
        )}
        {stage === "confirming" && (
          <>
            <button
              type="button"
              onClick={doReset}
              className="rounded-full bg-[color:var(--color-negative)] px-4 py-2 text-sm font-semibold text-white"
            >
              Yes, delete everything
            </button>
            <button
              type="button"
              onClick={() => setStage("idle")}
              className="rounded-full px-3 py-2 text-sm text-[color:var(--color-fg-muted)]"
            >
              Cancel
            </button>
          </>
        )}
        {stage === "deleting" && (
          <span className="text-sm text-[color:var(--color-fg-muted)]">
            Deleting…
          </span>
        )}
        {stage === "done" && (
          <span className="text-sm text-[color:var(--color-positive)]">
            Reset complete. Redirecting…
          </span>
        )}
        {stage === "error" && err && (
          <span className="text-sm text-[color:var(--color-negative)]">{err}</span>
        )}
      </div>
    </div>
  );
}

function Row({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card flex items-start justify-between gap-6 p-5">
      <div className="flex-1">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="mt-1 text-xs text-[color:var(--color-fg-subtle)]">{hint}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition ${
        checked
          ? "bg-[color:var(--color-accent)]"
          : "bg-[color:var(--color-surface-2)] border border-[color:var(--color-border)]"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
          checked ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}
