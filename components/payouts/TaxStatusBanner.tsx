"use client";

import Link from "next/link";
import { useTaxProfile } from "@/hooks/useTaxProfile";

export function TaxStatusBanner() {
  const { isMissing, isLoaded, payoutBlockReason } = useTaxProfile();

  if (!isLoaded || !isMissing) {
    return null;
  }

  return (
    <div
      role="alert"
      data-testid="payout-tax-block-banner"
      className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="text-xl">⚠️</span>
          <div>
            <h4 className="font-semibold text-sm">Tax Residency Form Required</h4>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
              {payoutBlockReason || "You must provide your tax residency and tax identification before invoice factoring payouts can be distributed."}
            </p>
          </div>
        </div>
        <Link
          href="/settings/tax"
          className="inline-flex shrink-0 items-center justify-center rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition-colors shadow-sm"
        >
          Submit Tax Form →
        </Link>
      </div>
    </div>
  );
}
