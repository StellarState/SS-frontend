"use client";

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  PartialPaymentContext,
  AllocationBreakdown,
  AllocationValidationResult,
  DistributionPreview,
  SettlementApprovalState,
  SettlementReceipt,
  validatePartialAllocation,
  calculateDistributionPreview,
  createSettlementReceipt,
} from "@/lib/analytics/partialSettlement";

const DEFAULT_MOCK_CONTEXT: PartialPaymentContext = {
  invoice_id: "inv-partial-88",
  invoice_title: "Stellar Wind Turbine Receivable Net 45",
  total_outstanding_principal: 10000,
  total_accrued_fees: 750,
  partial_payment_amount: 5000,
  issuer_address: "GBISSUER_ADMIN_KEY_01",
  positions: [
    {
      address: "GBINVESTOR_ALPHA_01",
      invested_principal: 5000,
      principal_share_ratio: 0.5,
    },
    {
      address: "GBINVESTOR_BETA_02",
      invested_principal: 3000,
      principal_share_ratio: 0.3,
    },
    {
      address: "GBINVESTOR_GAMMA_03",
      invested_principal: 2000,
      principal_share_ratio: 0.2,
    },
  ],
};

export function usePartialSettlement(
  initialContext: PartialPaymentContext = DEFAULT_MOCK_CONTEXT,
  currentUserAddress: string = "GBISSUER_ADMIN_KEY_01",
) {
  const [context, setContext] = useState<PartialPaymentContext>(initialContext);

  // Default allocation: 3500 principal, 1000 fees, 500 reserve = 5000 total
  const [allocation, setAllocation] = useState<AllocationBreakdown>({
    principal: 3500,
    fees: 1000,
    reserve: 500,
  });

  const [approvalState, setApprovalState] = useState<SettlementApprovalState>({
    status: "draft",
  });

  const [receipt, setReceipt] = useState<SettlementReceipt | null>(null);

  // Real-time validation
  const validation: AllocationValidationResult = useMemo(() => {
    return validatePartialAllocation(context.partial_payment_amount, allocation);
  }, [context.partial_payment_amount, allocation]);

  // Real-time distribution preview
  const preview: DistributionPreview = useMemo(() => {
    return calculateDistributionPreview(context, allocation);
  }, [context, allocation]);

  // Field setters
  const updatePrincipal = useCallback((amount: number) => {
    setAllocation((prev) => ({ ...prev, principal: amount }));
    setApprovalState({ status: "draft" });
    setReceipt(null);
  }, []);

  const updateFees = useCallback((amount: number) => {
    setAllocation((prev) => ({ ...prev, fees: amount }));
    setApprovalState({ status: "draft" });
    setReceipt(null);
  }, []);

  const updateReserve = useCallback((amount: number) => {
    setAllocation((prev) => ({ ...prev, reserve: amount }));
    setApprovalState({ status: "draft" });
    setReceipt(null);
  }, []);

  // Auto-balance reserve so total strictly equals payment amount
  const autoBalanceReserve = useCallback(() => {
    const remaining = Number(
      (context.partial_payment_amount - (allocation.principal + allocation.fees)).toFixed(4),
    );
    if (remaining >= 0) {
      setAllocation((prev) => ({ ...prev, reserve: remaining }));
      setApprovalState({ status: "draft" });
      setReceipt(null);
      toast.success(`Balanced reserve to ${remaining} XLM.`);
    } else {
      toast.error("Principal and fees exceed total payment amount.");
    }
  }, [context.partial_payment_amount, allocation.principal, allocation.fees]);

  // Request approval workflow
  const requestApproval = useCallback(() => {
    if (!validation.isValid) {
      toast.error(validation.errorReason ?? "Allocation cannot be submitted.");
      return;
    }

    setApprovalState({
      status: "pending_approval",
      requested_by: currentUserAddress,
      requested_at: new Date().toISOString(),
    });
    toast.info("Allocation submitted for authorised approval.");
  }, [validation, currentUserAddress]);

  // Confirm authorized approval and produce receipt
  const authorizeApproval = useCallback(
    (approverAddress: string = currentUserAddress) => {
      if (approvalState.status !== "pending_approval") {
        toast.error("Allocation must be in pending approval state.");
        return;
      }

      const approved: SettlementApprovalState = {
        status: "approved",
        approver_address: approverAddress,
        approved_at: new Date().toISOString(),
      };

      try {
        const finalReceipt = createSettlementReceipt(context, allocation, approved);
        setApprovalState(approved);
        setReceipt(finalReceipt);
        toast.success("Partial settlement allocation approved and finalized!");
      } catch (err: any) {
        toast.error(err.message || "Failed to finalize settlement.");
      }
    },
    [approvalState, context, allocation, currentUserAddress],
  );

  // Reject approval
  const rejectApproval = useCallback((reason: string = "Allocation rejected by approver.") => {
    setApprovalState({
      status: "rejected",
      rejection_reason: reason,
    });
    toast.error(reason);
  }, []);

  // Reset
  const resetAllocation = useCallback(() => {
    setAllocation({
      principal: 0,
      fees: 0,
      reserve: 0,
    });
    setApprovalState({ status: "draft" });
    setReceipt(null);
  }, []);

  return {
    context,
    setContext,
    allocation,
    validation,
    preview,
    approvalState,
    receipt,
    updatePrincipal,
    updateFees,
    updateReserve,
    autoBalanceReserve,
    requestApproval,
    authorizeApproval,
    rejectApproval,
    resetAllocation,
  };
}
