"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PORTFOLIO_QUERY_KEY } from "./usePortfolio";
import {
  SettlementClaimItem,
  OperatorDelegation,
  BulkReconciliation,
  ClaimAuditRecord,
  evaluateSettlementClaimEligibility,
  reconcileBulkClaims,
  processClaimExecution,
} from "@/lib/analytics/settlementQueue";

const DEFAULT_INITIAL_CLAIMS: SettlementClaimItem[] = [
  evaluateSettlementClaimEligibility({
    invoice_id: "inv-claim-001",
    invoice_title: "SolarGrid Equipment Receivable",
    investor_address: "GBINVESTOR_DEMO_ADDRESS",
    gross_return_amount: 1500,
    invoice_status: "settled",
    settled_at: "2026-11-18T14:00:00Z",
  }),
  evaluateSettlementClaimEligibility({
    invoice_id: "inv-claim-002",
    invoice_title: "Apex Logistics Net 60",
    investor_address: "GBINVESTOR_DEMO_ADDRESS",
    gross_return_amount: 3200,
    invoice_status: "settled",
    settled_at: "2026-11-19T09:30:00Z",
  }),
  evaluateSettlementClaimEligibility({
    invoice_id: "inv-claim-003",
    invoice_title: "BioHealth Pharma Batch B",
    investor_address: "GBINVESTOR_DEMO_ADDRESS",
    gross_return_amount: 850,
    invoice_status: "settled",
    settled_at: "2026-11-20T11:15:00Z",
  }),
];

const DEFAULT_DELEGATION: OperatorDelegation = {
  id: "del-default-01",
  investor_address: "GBINVESTOR_DEMO_ADDRESS",
  operator_address: "GBOPERATOR_AUTHORIZED_01",
  scopes: ["claims:execute", "claims:view"],
  expires_at: "2027-01-01T00:00:00Z",
  max_claim_amount_xlm: 10000,
  is_active: true,
};

export function useSettlementQueue(
  investorAddress: string = "GBINVESTOR_DEMO_ADDRESS",
  operatorAddress?: string,
) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<SettlementClaimItem[]>(DEFAULT_INITIAL_CLAIMS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [delegation, setDelegation] = useState<OperatorDelegation | null>(DEFAULT_DELEGATION);
  const [auditLog, setAuditLog] = useState<ClaimAuditRecord[]>([]);
  const [isOperatorMode, setIsOperatorMode] = useState<boolean>(false);

  // Eligible items only
  const eligibleItems = useMemo(
    () => items.filter((item) => item.is_eligible),
    [items],
  );

  const activeClaimant = isOperatorMode && operatorAddress
    ? operatorAddress
    : investorAddress;

  // Toggle selection
  const toggleSelect = useCallback((invoiceId: string) => {
    setSelectedIds((prev) =>
      prev.includes(invoiceId)
        ? prev.filter((id) => id !== invoiceId)
        : [...prev, invoiceId],
    );
  }, []);

  const selectAll = useCallback(() => {
    const claimableUnclaimed = eligibleItems
      .filter((i) => i.claim_status !== "claimed")
      .map((i) => i.invoice_id);
    setSelectedIds(claimableUnclaimed);
  }, [eligibleItems]);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  // Bulk reconciliation
  const reconciliation: BulkReconciliation = useMemo(() => {
    return reconcileBulkClaims(eligibleItems, selectedIds);
  }, [eligibleItems, selectedIds]);

  // Execute single claim
  const executeSingleClaim = useCallback(
    async (invoiceId: string, simulateFailure = false) => {
      const target = items.find((i) => i.invoice_id === invoiceId);
      if (!target) return;

      const { updatedItem, auditRecord } = processClaimExecution(
        target,
        activeClaimant,
        isOperatorMode ? delegation : null,
        {
          simulateFailure,
          failureReason: simulateFailure
            ? "Simulated Soroban contract execution failure."
            : undefined,
        },
      );

      setItems((prev) =>
        prev.map((i) => (i.invoice_id === invoiceId ? updatedItem : i)),
      );
      setAuditLog((prev) => [auditRecord, ...prev]);

      if (updatedItem.claim_status === "claimed") {
        toast.success(`Claim settled for ${updatedItem.invoice_title}`);
        queryClient.invalidateQueries({ queryKey: PORTFOLIO_QUERY_KEY });
        setSelectedIds((prev) => prev.filter((id) => id !== invoiceId));
      } else {
        toast.error(`Claim failed: ${updatedItem.last_error}`);
      }

      return { updatedItem, auditRecord };
    },
    [items, activeClaimant, isOperatorMode, delegation, queryClient],
  );

  // Execute bulk claim
  const executeBulkClaim = useCallback(async () => {
    if (selectedIds.length === 0) return;

    let successCount = 0;
    let failCount = 0;

    const newAuditRecords: ClaimAuditRecord[] = [];
    const updatedItems = [...items];

    for (const invoiceId of selectedIds) {
      const idx = updatedItems.findIndex((i) => i.invoice_id === invoiceId);
      if (idx === -1) continue;

      const { updatedItem, auditRecord } = processClaimExecution(
        updatedItems[idx],
        activeClaimant,
        isOperatorMode ? delegation : null,
      );

      updatedItems[idx] = updatedItem;
      newAuditRecords.unshift(auditRecord);

      if (updatedItem.claim_status === "claimed") {
        successCount++;
      } else {
        failCount++;
      }
    }

    setItems(updatedItems);
    setAuditLog((prev) => [...newAuditRecords, ...prev]);
    setSelectedIds([]);

    if (successCount > 0) {
      queryClient.invalidateQueries({ queryKey: PORTFOLIO_QUERY_KEY });
      toast.success(
        `Successfully claimed ${successCount} invoice${successCount > 1 ? "s" : ""}. Total net: ${reconciliation.netTotalPayout} XLM.`,
      );
    }
    if (failCount > 0) {
      toast.error(`${failCount} claim${failCount > 1 ? "s" : ""} could not be processed.`);
    }
  }, [selectedIds, items, activeClaimant, isOperatorMode, delegation, queryClient, reconciliation]);

  return {
    items,
    eligibleItems,
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
    reconciliation,
    delegation,
    setDelegation,
    isOperatorMode,
    setIsOperatorMode,
    auditLog,
    executeSingleClaim,
    executeBulkClaim,
  };
}
