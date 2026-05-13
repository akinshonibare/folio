"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileCheck, AlertCircle } from "lucide-react";

type Status =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "done"; positions: number; accounts: number; duplicate: boolean }
  | { kind: "error"; message: string };

export function UploadDropzone() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const router = useRouter();

  const upload = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".csv")) {
        setStatus({ kind: "error", message: "Please drop a .csv file." });
        return;
      }
      setStatus({ kind: "uploading" });
      try {
        const text = await file.text();
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ csv: text, filename: file.name }),
        });
        const json = await res.json();
        if (!res.ok) {
          setStatus({
            kind: "error",
            message: json.error ?? `Upload failed (HTTP ${res.status})`,
          });
          return;
        }
        setStatus({
          kind: "done",
          positions: json.positionsInserted ?? 0,
          accounts: json.accountsTouched ?? 0,
          duplicate: !!json.duplicate,
        });
        router.refresh();
      } catch (e) {
        setStatus({
          kind: "error",
          message: e instanceof Error ? e.message : "Upload failed",
        });
      }
    },
    [router],
  );

  return (
    <div className="card p-8">
      <label
        htmlFor="folio-csv"
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file) upload(file);
        }}
        className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[color:var(--color-border)] bg-[color:var(--color-surface-2)]/30 px-6 py-12 text-center transition hover:border-[color:var(--color-accent)] hover:bg-[color:var(--color-surface-2)]/60"
      >
        <UploadCloud
          size={36}
          className="text-[color:var(--color-fg-muted)]"
        />
        <div>
          <p className="font-medium">
            Drop your Wealthsimple holdings CSV here
          </p>
          <p className="mt-1 text-sm text-[color:var(--color-fg-subtle)]">
            Activity → Reports → Holdings (CSV). Drop it unmodified.
          </p>
        </div>
        <input
          id="folio-csv"
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
          }}
        />
      </label>
      <div className="mt-4 min-h-[2rem]">
        {status.kind === "uploading" && (
          <p className="text-sm text-[color:var(--color-fg-muted)]">
            Parsing and ingesting…
          </p>
        )}
        {status.kind === "done" && (
          <p className="flex items-center gap-2 text-sm text-[color:var(--color-positive)]">
            <FileCheck size={16} />
            {status.duplicate
              ? "This CSV was already uploaded — no changes."
              : `Snapshot ingested · ${status.positions} positions across ${status.accounts} accounts.`}
          </p>
        )}
        {status.kind === "error" && (
          <p className="flex items-center gap-2 text-sm text-[color:var(--color-negative)]">
            <AlertCircle size={16} />
            {status.message}
          </p>
        )}
      </div>
    </div>
  );
}
