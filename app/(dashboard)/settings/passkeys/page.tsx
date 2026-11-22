import { PasskeySettingsPanel } from "@/components/settings/PasskeySettingsPanel";

/**
 * Passkey Security Settings Page (Issue #674).
 *
 * Enables passwordless FIDO2 / WebAuthn passkey registration, biometric login,
 * fresh removal confirmation, and high-risk action authorization.
 */
export default function PasskeysSettingsPage() {
  return (
    <main className="container mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold">Passkeys &amp; Hardware Security</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage WebAuthn biometric credentials and security keys for passwordless account protection.
        </p>
      </div>

      <PasskeySettingsPanel />
    </main>
  );
}
