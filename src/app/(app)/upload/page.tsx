import { UploadDropzone } from "@/components/UploadDropzone";
import { TopBar } from "@/components/ui/TopBar";
import { ensureUserRow } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  await ensureUserRow();
  return (
    <>
      <TopBar title="Upload" back="/home" />
      <div className="space-y-6 pt-2">
        <div>
          <p className="subhead">New snapshot</p>
          <h1 className="section-title mt-1">Drop your CSV</h1>
          <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
            Every CSV is a full point-in-time snapshot. Re-uploading the same
            file is a no-op. Folio recognises equities, ETFs, crypto, options
            (OCC format), and precious metals.
          </p>
        </div>
        <UploadDropzone />
      </div>
    </>
  );
}
