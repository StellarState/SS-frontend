import { WalletRecoverySettings } from "@/components/settings/WalletRecoverySettings";

/**
 * Wallet Recovery Readiness & Cooldown Settings Page (Issue #673).
 *
 * Provides users with recovery posture checklist, readiness scoring,
 * zero-secret security assurance, and 48-hour recovery address timelock cooldowns.
 */
export default function WalletRecoveryPage() {
  return (
    <main className="container mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold">Wallet Recovery Readiness</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure account survivability controls and manage timelocked recovery guardians.
        </p>
      </div>

      <WalletRecoverySettings />
    </main>
  );
}
