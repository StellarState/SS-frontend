"use client";

/**
 * Collateral health query for issuer invoice positions (#644).
 *
 * Fetches `/api/invoices/{id}/collateral` returning ratio and band.
 */
import { useQuery } from "@tanstack/react-query";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export const COLLATERAL_QUERY_KEY = (invoiceId: string) =>
  ["collateral-health", invoiceId] as const;

export interface CollateralHealth {
  required: number;
  posted: number;
  ratio: number;
  band: "safe" | "warning" | "critical";
}

async function fetchCollateralHealth(invoiceId: string): Promise<CollateralHealth> {
  const res = await fetch(`${API_BASE}/invoices/${invoiceId}/collateral`);
  if (!res.ok) throw new Error("Failed to fetch collateral health");
  return res.json();
}

export function useCollateralHealth(invoiceId: string) {
  return useQuery<CollateralHealth>({
    queryKey: COLLATERAL_QUERY_KEY(invoiceId),
    queryFn: () => fetchCollateralHealth(invoiceId),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: Boolean(invoiceId),




import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  type CollateralPosition,
  type CollateralActionHistory,
  type ValuationModel,
  calculateCollateralHealth,
} from "@/lib/analytics/collateralHealth";

export const COLLATERAL_POSITION_KEY = ["collateral-position"] as const;
export const COLLATERAL_HISTORY_KEY = ["collateral-history"] as const;

const mockPositions: Map<string, CollateralPosition> = new Map();
const mockHistory: Map<string, CollateralActionHistory[]> = new Map();

export async function fetchCollateralPosition(
  invoiceId: string,
  valuationModel: ValuationModel = "mark_to_market",
): Promise<CollateralPosition | null> {
  try {
    const res = await fetch(`/api/invoices/${invoiceId}/collateral?model=${valuationModel}`);
    if (res.ok) {
      const data = await res.json();
      return data.position ?? null;
    }
  } catch {
    // API route unavailable; return mock
  }

  if (!mockPositions.has(invoiceId)) {
    const debt = 50000;
    const collateral = 60000; // 120%
    const calc = calculateCollateralHealth(debt, collateral, valuationModel);

    const pos: CollateralPosition = {
      id: `pos-${invoiceId}`,
      invoice_id: invoiceId,
      borrower_address: "GBBORROWER123",
      outstanding_debt_xlm: debt,
      current_collateral_xlm: collateral,
      collateral_asset: "XLM",
      valuation_model: valuationModel,
      haircut_percent: 15.0,
      effective_collateral_value: calc.effectiveCollateralValue,
      required_collateral_value: calc.requiredCollateralValue,
      buffer_amount_xlm: calc.bufferAmountXlm,
      current_health_ratio_percent: calc.healthRatioPercent,
      health_status: calc.status,
    };
    mockPositions.set(invoiceId, pos);

    mockHistory.set(invoiceId, [
      {
        id: `act-init-${invoiceId}`,
        position_id: pos.id,
        type: "top_up",
        amount_xlm: 60000,
        source_or_destination: "Stellar Primary Vault",
        previous_ratio_percent: 0,
        resulting_ratio_percent: calc.healthRatioPercent,
        timestamp: "2026-11-10T12:00:00Z",
        tx_hash: "tx_init_vault",
      },
    ]);
  }

  const existing = mockPositions.get(invoiceId)!;
  // Recalculate with chosen valuation model
  const calc = calculateCollateralHealth(
    existing.outstanding_debt_xlm,
    existing.current_collateral_xlm,
    valuationModel,
    existing.haircut_percent,
  );

  return {
    ...existing,
    valuation_model: valuationModel,
    effective_collateral_value: calc.effectiveCollateralValue,
    required_collateral_value: calc.requiredCollateralValue,
    buffer_amount_xlm: calc.bufferAmountXlm,
    current_health_ratio_percent: calc.healthRatioPercent,
    health_status: calc.status,
  };
}

export async function fetchCollateralHistory(invoiceId: string): Promise<CollateralActionHistory[]> {
  try {
    const res = await fetch(`/api/invoices/${invoiceId}/collateral/history`);
    if (res.ok) {
      const data = await res.json();
      return data.history ?? [];
    }
  } catch {
    // Fallback
  }

  return mockHistory.get(invoiceId) ?? [];
}

export function useCollateralPosition(
  invoiceId: string,
  valuationModel: ValuationModel = "mark_to_market",
) {
  return useQuery({
    queryKey: [...COLLATERAL_POSITION_KEY, invoiceId, valuationModel],
    queryFn: () => fetchCollateralPosition(invoiceId, valuationModel),
    enabled: Boolean(invoiceId),
    staleTime: 15 * 1000,
  });
}

export function useCollateralHistory(invoiceId: string) {
  return useQuery({
    queryKey: [...COLLATERAL_HISTORY_KEY, invoiceId],
    queryFn: () => fetchCollateralHistory(invoiceId),
    enabled: Boolean(invoiceId),
    staleTime: 15 * 1000,
  });
}

export function useTopUpCollateralMutation(invoiceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      amount,
      sourceAddress,
    }: {
      amount: number;
      sourceAddress: string;
    }) => {
      try {
        const res = await fetch(`/api/invoices/${invoiceId}/collateral/topup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount, sourceAddress }),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch {
        // Fallback
      }

      const pos = mockPositions.get(invoiceId);
      if (pos) {
        const newTotal = pos.current_collateral_xlm + amount;
        pos.current_collateral_xlm = newTotal;
        mockPositions.set(invoiceId, pos);

        const hist = mockHistory.get(invoiceId) ?? [];
        hist.unshift({
          id: `act-${Date.now()}`,
          position_id: pos.id,
          type: "top_up",
          amount_xlm: amount,
          source_or_destination: sourceAddress,
          previous_ratio_percent: pos.current_health_ratio_percent,
          resulting_ratio_percent: Number(((newTotal / pos.outstanding_debt_xlm) * 100).toFixed(2)),
          timestamp: new Date().toISOString(),
          tx_hash: `tx_topup_${Date.now()}`,
        });
        mockHistory.set(invoiceId, hist);
      }
      return null;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...COLLATERAL_POSITION_KEY, invoiceId] });
      void queryClient.invalidateQueries({ queryKey: [...COLLATERAL_HISTORY_KEY, invoiceId] });
      toast.success("Collateral topped up successfully!");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to top up collateral");
    },
  });
}

export function useWithdrawCollateralMutation(invoiceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      amount,
      destinationAddress,
    }: {
      amount: number;
      destinationAddress: string;
    }) => {
      try {
        const res = await fetch(`/api/invoices/${invoiceId}/collateral/withdraw`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount, destinationAddress }),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch {
        // Fallback
      }

      const pos = mockPositions.get(invoiceId);
      if (pos) {
        const newTotal = pos.current_collateral_xlm - amount;
        pos.current_collateral_xlm = newTotal;
        mockPositions.set(invoiceId, pos);

        const hist = mockHistory.get(invoiceId) ?? [];
        hist.unshift({
          id: `act-${Date.now()}`,
          position_id: pos.id,
          type: "withdrawal",
          amount_xlm: amount,
          source_or_destination: destinationAddress,
          previous_ratio_percent: pos.current_health_ratio_percent,
          resulting_ratio_percent: Number(((newTotal / pos.outstanding_debt_xlm) * 100).toFixed(2)),
          timestamp: new Date().toISOString(),
          tx_hash: `tx_with_${Date.now()}`,
        });
        mockHistory.set(invoiceId, hist);
      }
      return null;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...COLLATERAL_POSITION_KEY, invoiceId] });
      void queryClient.invalidateQueries({ queryKey: [...COLLATERAL_HISTORY_KEY, invoiceId] });
      toast.success("Excess collateral withdrawn successfully!");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to withdraw collateral");
    },
  });
}
