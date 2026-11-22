"use client";

import { useState, useMemo, useCallback } from "react";
import {
  type InvestorMetricsSnapshot,
  type RewardLedgerEntry,
  type TierEvaluationResult,
  evaluateInvestorTier,
  reconcileRewardLedger,
  validateRedemption,
} from "@/lib/loyalty/loyaltyTiers";

const DEFAULT_SNAPSHOT: InvestorMetricsSnapshot = {
  snapshotId: "snap-init-101",
  evaluatedAt: new Date().toISOString(),
  volume30dXLM: 12_500,
  retentionDays: 22,
};

const DEFAULT_LEDGER_ENTRIES: RewardLedgerEntry[] = [
  {
    id: "rew-1",
    type: "yield_multiplier_payout",
    amountXLM: 45.2,
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    description: "+5% Silver Yield Boost on Invoice #INV-882",
  },
  {
    id: "rew-2",
    type: "fee_rebate",
    amountXLM: 18.5,
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    description: "15% Settlement Fee Rebate on Settlement #SET-304",
  },
];

export function useLoyaltyTiers() {
  const [snapshot, setSnapshot] = useState<InvestorMetricsSnapshot>(DEFAULT_SNAPSHOT);
  const [ledgerEntries, setLedgerEntries] = useState<RewardLedgerEntry[]>(DEFAULT_LEDGER_ENTRIES);

  const evaluation: TierEvaluationResult = useMemo(() => {
    return evaluateInvestorTier(snapshot);
  }, [snapshot]);

  const reconciledLedger = useMemo(() => {
    return reconcileRewardLedger(ledgerEntries);
  }, [ledgerEntries]);

  // Evaluates tier update strictly based on a verified snapshot
  const applyServerSnapshot = useCallback(
    (newSnapshot: InvestorMetricsSnapshot) => {
      setSnapshot(newSnapshot);
    },
    [],
  );

  const redeemReward = useCallback(
    (amountXLM: number, target: string): { success: boolean; error?: string } => {
      const val = validateRedemption(amountXLM, reconciledLedger);
      if (!val.valid) {
        return { success: false, error: val.error };
      }

      const entry: RewardLedgerEntry = {
        id: `red-${Date.now()}`,
        type: "redemption",
        amountXLM,
        timestamp: new Date().toISOString(),
        description: `Redeemed ${amountXLM} XLM to ${target}`,
      };

      setLedgerEntries((prev) => [entry, ...prev]);
      return { success: true };
    },
    [reconciledLedger],
  );

  return {
    evaluation,
    reconciledLedger,
    applyServerSnapshot,
    redeemReward,
  };
}
