import { ensureUserRow, getUserSettings } from "@/lib/auth/session";
import { polygonAvailable } from "@/lib/quotes/provider";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const userId = await ensureUserRow();
  const settings = await getUserSettings(userId);
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)]">
          Settings
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Your preferences</h1>
      </div>
      <SettingsForm
        initial={{
          quoteProvider: settings?.quoteProvider ?? "yahoo",
          stealthDefault: settings?.stealthDefault ?? false,
          shareDollarsInGroups: settings?.shareDollarsInGroups ?? false,
        }}
        polygonAvailable={polygonAvailable()}
      />
    </div>
  );
}
