import { AccountSettings } from "@/components/settings/AccountSettings";
import { EmailVerificationSettings } from "@/components/email/EmailVerificationSettings";

// #444 — investor account settings: profile, notifications, security and wallet.
export default function AccountSettingsPage() {
  return (
    <main className="container mx-auto max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Account settings</h1>
      <EmailVerificationSettings />
      <AccountSettings />
    </main>
  );
}
