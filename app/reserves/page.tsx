"use client";

import { ProofOfReservesDashboard } from "@/components/reserves";
import { usePageTitle } from "@/hooks/usePageTitle";

/**
 * Public Proof of Reserves Page (Issue #677).
 *
 * Provides real-time public reconciliation of protocol liabilities vs
 * backing assets, on-chain balances, reserve gap indicators, and auditor attestations.
 * Fully accessible while logged out.
 */
export default function ReservesPage() {
  usePageTitle("Proof of Reserves");

  return (
    <main className="container mx-auto px-4 py-8 pb-24 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Proof of Reserves</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Public real-time proof that StellarSettle protocol balances match outstanding liabilities.
        </p>
      </header>

      <ProofOfReservesDashboard />
    </main>
  );
}
