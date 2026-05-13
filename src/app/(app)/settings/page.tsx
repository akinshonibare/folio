import { ensureUserRow, getUserSettings } from "@/lib/auth/session";
import { polygonAvailable } from "@/lib/quotes/provider";
import { SettingsForm } from "./settings-form";
import { TopBar } from "@/components/ui/TopBar";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const userId = await ensureUserRow();
  const settings = await getUserSettings(userId);
  return (
    <>
      <TopBar title="Settings" back="/home" />
      <div className="space-y-6 pt-2">
        <div>
          <p className="subhead">Your preferences</p>
          <h1 className="section-title mt-1">Settings</h1>
        </div>
        <SettingsForm
          initial={{
            quoteProvider: settings?.quoteProvider ?? "yahoo",
            displayCurrency: settings?.displayCurrency ?? "CAD",
            stealthDefault: settings?.stealthDefault ?? false,
            shareDollarsInGroups: settings?.shareDollarsInGroups ?? false,
          }}
          polygonAvailable={polygonAvailable()}
        />
      </div>
    </>
  );
}
