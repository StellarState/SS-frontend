import Link from "next/link";
import { CurrencySettings } from "@/components/settings/CurrencySettings";
import { RestartTourSettings } from "@/components/settings/RestartTourSettings";
import { NetworkSelector } from "@/components/network/NetworkSelector";
import { AutoInvestSettingsPanel } from "@/components/investor/AutoInvestSettingsPanel";
import { RolloverSettingsPanel } from "@/components/investor/RolloverSettingsPanel";

// #437 — general settings page; hosts the display-currency toggle.
// #443 — Stellar network selector.
// #476 — auto-invest rule configuration panel.
// #545 — invoice auto-rollover configuration panel.
export default function SettingsPage() {
  return (
    <main className="container mx-auto max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <CurrencySettings />
      <NetworkSelector />
      <section id="auto-invest" className="space-y-3">
        <h2 className="text-lg font-semibold">Auto-invest</h2>
        <AutoInvestSettingsPanel />
      </section>
      <section id="rollover" className="space-y-3">
        <h2 className="text-lg font-semibold">Auto-rollover</h2>
        <RolloverSettingsPanel />
      </section>
      <section id="alerts" className="space-y-3">
        <h2 className="text-lg font-semibold">Alerts</h2>
        <Link
          href="/settings/alerts"
          className="inline-block text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Alert preferences →
        </Link>
      </section>
      <RestartTourSettings />
      <Link
        href="/settings/notifications"
        className="inline-block text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Notification preferences →
      </Link>
      <br />
      <Link
        href="/settings/account"
        className="inline-block text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Account settings →
      </Link>
      <br />
      <Link
        href="/settings/my-reports"
        className="inline-block text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        My Reports →
      </Link>
      <br />
      <Link
        href="/settings/privacy"
        className="inline-block text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Privacy settings →
      </Link>
    </main>
  );
}
