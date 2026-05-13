import { UploadDropzone } from "@/components/UploadDropzone";

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)]">
          Upload
        </p>
        <h1 className="mt-1 text-2xl font-semibold">New snapshot</h1>
        <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
          Every CSV is treated as a full point-in-time snapshot. Re-uploading the
          same file is a no-op. Folio recognises equities, ETFs, crypto, options
          (OCC symbol format), and precious metals.
        </p>
      </div>
      <UploadDropzone />
    </div>
  );
}
