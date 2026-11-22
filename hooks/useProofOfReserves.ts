"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ReserveAccount,
  ObligationCategory,
  ReservesSummary,
  ReserveNetwork,
  computeReservesSummary,
  SAMPLE_RESERVE_ACCOUNTS,
  SAMPLE_OBLIGATIONS,
} from "@/lib/analytics/proofOfReserves";

export interface UseProofOfReservesOptions {
  initialAccounts?: ReserveAccount[];
  initialObligations?: ObligationCategory[];
  initialTimestamp?: string;
}

export function useProofOfReserves(options?: UseProofOfReservesOptions) {
  const [accounts, setAccounts] = useState<ReserveAccount[]>(
    options?.initialAccounts ?? SAMPLE_RESERVE_ACCOUNTS
  );
  const [obligations, setObligations] = useState<ObligationCategory[]>(
    options?.initialObligations ?? SAMPLE_OBLIGATIONS
  );
  const [snapshotTimestamp, setSnapshotTimestamp] = useState<string>(
    options?.initialTimestamp ?? new Date().toISOString()
  );
  const [filterNetwork, setFilterNetwork] = useState<ReserveNetwork | "all">("all");
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const summary = useMemo(() => {
    return computeReservesSummary(accounts, obligations, snapshotTimestamp);
  }, [accounts, obligations, snapshotTimestamp]);

  const filteredAccounts = useMemo(() => {
    if (filterNetwork === "all") return summary.accounts;
    return summary.accounts.filter((acc) => acc.network === filterNetwork);
  }, [summary.accounts, filterNetwork]);

  const refreshSnapshot = useCallback(() => {
    setIsLoading(true);
    setIsError(false);
    try {
      setSnapshotTimestamp(new Date().toISOString());
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const simulateState = useCallback((scenario: "balanced" | "gap" | "stale") => {
    if (scenario === "balanced") {
      setAccounts(SAMPLE_RESERVE_ACCOUNTS);
      setObligations(SAMPLE_OBLIGATIONS);
      setSnapshotTimestamp(new Date().toISOString());
    } else if (scenario === "gap") {
      // Undercollateralized scenario: obligations exceed assets
      setAccounts(
        SAMPLE_RESERVE_ACCOUNTS.map((a) => ({
          ...a,
          balance: Math.round(a.balance * 0.7),
        }))
      );
      setObligations(SAMPLE_OBLIGATIONS);
      setSnapshotTimestamp(new Date().toISOString());
    } else if (scenario === "stale") {
      // Snapshot older than 24 hours
      setAccounts(SAMPLE_RESERVE_ACCOUNTS);
      setObligations(SAMPLE_OBLIGATIONS);
      const staleDate = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();
      setSnapshotTimestamp(staleDate);
    }
  }, []);

  return {
    summary,
    filteredAccounts,
    filterNetwork,
    setFilterNetwork,
    isLoading,
    isError,
    refreshSnapshot,
    simulateState,
  };
}
