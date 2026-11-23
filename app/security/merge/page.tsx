"use client";

import { AccountMergeWizard } from "@/components/security";
import { usePageTitle } from "@/hooks/usePageTitle";

/**
 * Account Merge & Duplicate Wallet Resolution Wizard (Issue #675).
 *
 * Implements safe, auditable multi-wallet consolidation with dual cryptographic proofs,
 * KYC conflict blocking, stale session revocation, and immutable audit receipts.
 */
export default function AccountMergePage() {
  usePageTitle("Account Merge Wizard");

  return (
    <main className="container mx-auto px-4 py-8 pb-24 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Account Merge</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Consolidate duplicate wallets into a primary account with cryptographic ownership proofs and strict compliance checks.
        </p>
      </header>

      <AccountMergeWizard />
    </main>
  );
}
