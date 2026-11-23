"use client";

import { BadgeCheck } from "lucide-react";
import type { ExitPreview } from "@/lib/api";

function xlm(value: number): string {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 7 })} XLM`;
}

/**
 * Commitment → fee → net refund for an early exit (#593). The figures come
 * from `normalizeExitPreview`, which derives the refund from the fee so the
 * rows always add up to the commitment.
 */
export function ExitFeeBreakdown({ preview }: { preview: ExitPreview }) {
  return (
    <div className="space-y-3" data-testid="exit-fee-breakdown">
      {preview.fee_waived && (
        <div
          className="flex items-start gap-2 rounded-md border border-green-600/30 bg-green-600/10 p-3 text-sm text-green-800 dark:text-green-300"
          role="status"
          data-testid="exit-fee-waived"
        >
          <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Exit fee waived — this invoice did not reach its minimum funding, so you get your
            full commitment back.
          </span>
        </div>
      )}
      <dl className="divide-y rounded-md border text-sm">
        <div className="flex justify-between p-3">
          <dt className="text-muted-foreground">Commitment</dt>
          <dd className="font-medium" data-testid="exit-commitment">{xlm(preview.commitment)}</dd>
        </div>
        <div className="flex justify-between p-3">
          <dt className="text-muted-foreground">Exit fee</dt>
          <dd className="font-medium" data-testid="exit-fee-percent">
            {preview.fee_percent.toLocaleString(undefined, { maximumFractionDigits: 2 })}%
          </dd>
        </div>
        <div className="flex justify-between p-3">
          <dt className="text-muted-foreground">Fee amount</dt>
          <dd className="font-medium" data-testid="exit-fee-amount">
            {preview.fee_amount > 0 ? `− ${xlm(preview.fee_amount)}` : xlm(0)}
          </dd>
        </div>
        <div className="flex justify-between bg-muted/40 p-3">
          <dt className="font-semibold">Net refund</dt>
          <dd className="font-semibold" data-testid="exit-net-refund">{xlm(preview.net_refund)}</dd>
        </div>
      </dl>
    </div>
  );
}
