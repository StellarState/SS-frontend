"use client";

import { useEffect, useState } from "react";
import {
  BASE_NETWORK_FEE_XLM,
  cannotCoverFees,
  readSimulatedFee,
  totalCost,
  type TransactionBuilderLike,
} from "@/lib/feeEstimate";

export const FEE_ESTIMATE_DEBOUNCE_MS = 400;

export interface FeeEstimateOptions {
  /** Transaction simulator. Changing it or the amount triggers a new estimate. */
  txBuilder: TransactionBuilderLike | null;
  amount: number;
  platformFee?: number;
  /** Native XLM balance. `null` means unknown and never blocks signing. */
  xlmBalance?: number | null;
  debounceMs?: number;
}

export interface FeeEstimateResult {
  networkFee: number;
  platformFee: number;
  total: number;
  loading: boolean;
  usedFallback: boolean;
  insufficientBalance: boolean;
  reason: string | null;
}

/**
 * Simulates the pending transaction and returns the fee breakdown (issue #654).
 *
 * Input changes are debounced so typing an amount produces one simulation.
 * A failed simulation returns the base fee and does not block signing.
 */
export function useFeeEstimate({
  txBuilder,
  amount,
  platformFee = 0,
  xlmBalance = null,
  debounceMs = FEE_ESTIMATE_DEBOUNCE_MS,
}: FeeEstimateOptions): FeeEstimateResult {
  const [networkFee, setNetworkFee] = useState(BASE_NETWORK_FEE_XLM);
  const [loading, setLoading] = useState(true);
  const [usedFallback, setUsedFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(() => {
      if (!txBuilder) {
        if (!cancelled) {
          setNetworkFee(BASE_NETWORK_FEE_XLM);
          setUsedFallback(true);
          setLoading(false);
        }
        return;
      }

      Promise.resolve(txBuilder.simulate())
        .then((result) => {
          if (cancelled) return;
          const simulated = readSimulatedFee(result);
          if (simulated === null) {
            setNetworkFee(BASE_NETWORK_FEE_XLM);
            setUsedFallback(true);
          } else {
            setNetworkFee(simulated);
            setUsedFallback(false);
          }
        })
        .catch(() => {
          if (cancelled) return;
          setNetworkFee(BASE_NETWORK_FEE_XLM);
          setUsedFallback(true);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, debounceMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [txBuilder, amount, debounceMs]);

  const insufficientBalance = cannotCoverFees(xlmBalance, amount, platformFee, networkFee);
  const reason = insufficientBalance
    ? `Insufficient XLM: the amount, fees and base reserve exceed your balance of ${xlmBalance} XLM.`
    : null;

  return {
    networkFee,
    platformFee,
    total: totalCost(amount, platformFee, networkFee),
    loading,
    usedFallback,
    insufficientBalance,
    reason,
  };
}
