"use client";

import { KycExpiryBanner } from "@/components/kyc";
import { usePageTitle } from "@/hooks/usePageTitle";

/**
 * KYC Expiry & Re-Verification Workflow Page (Issue #672).
 *
 * Provides proactive expiration countdowns, restricts high-risk actions
 * during the final grace window, preserves verified historical fields,
 * and silences reminders upon submission.
 */
export default function KycReverificationPage() {
  usePageTitle("KYC Accreditation Expiry & Renewal");

  return (
    <main className="container mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">KYC Accreditation Status</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage regulatory document expiry deadlines and complete fast-track renewals.
        </p>
      </div>

      <KycExpiryBanner />
    </main>
  );
}
