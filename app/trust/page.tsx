"use client";

import { TrustPage } from "@/components/trust/TrustPage";
import { usePageTitle } from "@/hooks/usePageTitle";

/** Public trust and security page, reachable without signing in (issue #655). */
export default function TrustRoute() {
  usePageTitle("Trust and Security");

  return (
    <main className="container mx-auto px-4 py-8 pb-24 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Trust and Security</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          How StellarSettle protects funds, who audits the contracts, and the exact deployments you can verify.
        </p>
      </header>
      <TrustPage />
    </main>
  );
}
