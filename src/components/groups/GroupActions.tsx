"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, LogIn } from "lucide-react";

export function GroupActions() {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "create" | "join">("idle");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function create() {
    if (!name.trim()) return;
    setPending(true);
    setErr(null);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const j = await res.json();
      if (!res.ok) {
        setErr(j.error ?? "Create failed");
        return;
      }
      setName("");
      setMode("idle");
      router.push(`/groups/${j.id}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function join() {
    if (!code.trim()) return;
    setPending(true);
    setErr(null);
    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const j = await res.json();
      if (!res.ok) {
        setErr(j.error ?? "Join failed");
        return;
      }
      setCode("");
      setMode("idle");
      router.push(`/groups/${j.id}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (mode === "idle") {
    return (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("create")}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[color:var(--color-accent)] px-4 py-2 text-sm font-semibold text-black"
        >
          <Plus size={14} />
          New group
        </button>
        <button
          type="button"
          onClick={() => setMode("join")}
          className="flex flex-1 items-center justify-center gap-2 rounded-full border border-[color:var(--color-border)] px-4 py-2 text-sm font-semibold"
        >
          <LogIn size={14} />
          Join with code
        </button>
      </div>
    );
  }

  return (
    <div className="card p-4">
      {mode === "create" ? (
        <>
          <p className="text-sm font-medium">Create a group</p>
          <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
            You'll get a 6-character invite code to share with friends. Members
            see each other's tickers and quantities; dollar amounts are gated
            by each member's own "Share dollars in groups" setting.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. The Wagies"
              className="flex-1 rounded-full bg-[color:var(--color-surface-2)] px-4 py-2 text-sm focus:outline-none"
            />
            <button
              type="button"
              disabled={pending || !name.trim()}
              onClick={create}
              className="rounded-full bg-[color:var(--color-accent)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm font-medium">Join a group</p>
          <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
            Enter the 6-character invite code your friend shared.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={12}
              placeholder="ABC123"
              className="flex-1 rounded-full bg-[color:var(--color-surface-2)] px-4 py-2 text-sm font-mono tracking-widest focus:outline-none"
            />
            <button
              type="button"
              disabled={pending || !code.trim()}
              onClick={join}
              className="rounded-full bg-[color:var(--color-accent)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
            >
              Join
            </button>
          </div>
        </>
      )}
      <div className="mt-2 flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={() => setMode("idle")}
          className="text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]"
        >
          Cancel
        </button>
        {err && (
          <span className="text-[color:var(--color-negative)]">{err}</span>
        )}
      </div>
    </div>
  );
}
