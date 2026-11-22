"use client";

import { useEffect, useMemo } from "react";
import { FeeSummary } from "@/components/fees/FeeSummary";
import { useFeeEstimate } from "@/hooks/useFeeEstimate";
import { createFeeSimulator, type TransactionBuilderLike } from "@/lib/feeEstimate";

interface FeeBreakdownProps {
  /** Transaction amount in XLM. Re-estimation is debounced on change. */
  amount: number;
  /** Platform fee in XLM. */
  platformFee?: number;
  /** Native XLM balance. Unknown (null) never blocks confirmation. */
  xlmBalance?: number | null;
  /** Injected simulator. Defaults to the backend fee-estimate endpoint. */
  txBuilder?: TransactionBuilderLike | null;
  /** Notifies the parent whether the balance can cover amount, fees and reserve. */
  onInsufficientBalance?: (insufficient: boolean) => void;
}

/**
 * Self-contained fee estimate shown before signing (issue #654).
 *
 * Combines the debounced estimate hook with the accessible summary. Parents
 * gate their confirm button through `onInsufficientBalance`; a failed
 * simulation falls back to the base fee and never blocks signing.
 */
export function FeeBreakdown({
  amount,
  platformFee = 0,
  xlmBalance = null,
  txBuilder,
  onInsufficientBalance,
}: FeeBreakdownProps) {
  const builder = useMemo(
    () => (txBuilder === undefined ? createFeeSimulator(amount) : txBuilder),
    [txBuilder, amount],
  );
  const estimate = useFeeEstimate({
    txBuilder: builder,
    amount,
    platformFee,
    xlmBalance,
  });

  useEffect(() => {
    onInsufficientBalance?.(estimate.insufficientBalance);
  }, [estimate.insufficientBalance, onInsufficientBalance]);

  return <FeeSummary amount={amount} estimate={estimate} />;
}
