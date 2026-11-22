"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { FeeEstimateResult } from "@/hooks/useFeeEstimate";

interface FeeSummaryProps {
  amount: number;
  estimate: FeeEstimateResult;
}

function Row({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium" data-testid={testId}>
        {value}
      </span>
    </div>
  );
}

/** Amount, platform fee, network fee and total shown before signing (issue #654). */
export function FeeSummary({ amount, estimate }: FeeSummaryProps) {
  const { networkFee, platformFee, total, loading, usedFallback, insufficientBalance, reason } = estimate;

  return (
    <div
      className="space-y-2 rounded-md border p-3"
      data-testid="fee-summary"
      aria-live="polite"
      aria-atomic="true"
    >
      <h4 className="text-sm font-semibold">Cost breakdown</h4>
      {loading ? (
        <div className="space-y-2" data-testid="fee-summary-loading">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : (
        <>
          <Row label="Amount" value={`${amount.toFixed(7)} XLM`} testId="fee-amount" />
          <Row label="Platform fee" value={`${platformFee.toFixed(7)} XLM`} testId="fee-platform" />
          <Row label="Network fee" value={`${networkFee.toFixed(7)} XLM`} testId="fee-network" />
          <Row label="Total" value={`${total.toFixed(7)} XLM`} testId="fee-total" />
        </>
      )}
      {usedFallback && !loading && (
        <p className="text-xs text-muted-foreground" data-testid="fee-fallback">
          Network fee could not be simulated. Using the base fee estimate; you can still sign.
        </p>
      )}
      {insufficientBalance && (
        <p role="alert" className="text-sm text-destructive" data-testid="fee-insufficient">
          {reason}
        </p>
      )}
    </div>
  );
}
