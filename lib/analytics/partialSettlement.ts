/**
 * Partial settlement allocation analytics and validation engine (#681).
 *
 * Implements allocation across principal, fees, and reserve,
 * strict total reconciliation (no over- or under-total),
 * pro-rata per-position distributions, authorized approval gating,
 * and immutable settlement receipts.
 */

export interface InvestorPosition {
  address: string;
  invested_principal: number;
  principal_share_ratio: number; // e.g. 0.6 for 60%
}

export interface PartialPaymentContext {
  invoice_id: string;
  invoice_title: string;
  total_outstanding_principal: number;
  total_accrued_fees: number;
  partial_payment_amount: number;
  positions: InvestorPosition[];
  issuer_address: string;
}

export interface AllocationBreakdown {
  principal: number;
  fees: number;
  reserve: number;
}

export interface AllocationValidationResult {
  isValid: boolean;
  totalAllocated: number;
  difference: number; // payment - totalAllocated
  errorReason: string | null;
}

export interface PerPositionDistribution {
  investor_address: string;
  invested_principal: number;
  principal_share_ratio: number;
  principal_payout: number;
  fee_payout: number;
  total_payout: number;
}

export interface DistributionPreview {
  positions: PerPositionDistribution[];
  totalPrincipalDistributed: number;
  totalFeesDistributed: number;
  totalInvestorPayouts: number;
  reserveRetained: number;
  isReconciled: boolean;
}

export type ApprovalStatus = "draft" | "pending_approval" | "approved" | "rejected";

export interface SettlementApprovalState {
  status: ApprovalStatus;
  requested_by?: string;
  requested_at?: string;
  approver_address?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
}

export interface SettlementReceipt {
  receipt_id: string;
  invoice_id: string;
  invoice_title: string;
  total_payment_received: number;
  allocation: AllocationBreakdown;
  distribution_summary: {
    investor_total: number;
    reserve_retained: number;
    investor_count: number;
  };
  approved_by: string;
  approved_at: string;
  tx_hash: string;
  status: "finalized";
}

/**
 * Validates that allocation values are non-negative and strictly sum to the payment amount.
 * Acceptance criteria: Allocation cannot over- or under-total; Fees are separate from principal.
 */
export function validatePartialAllocation(
  paymentAmount: number,
  allocation: AllocationBreakdown,
): AllocationValidationResult {
  if (paymentAmount <= 0) {
    return {
      isValid: false,
      totalAllocated: 0,
      difference: 0,
      errorReason: "Payment amount must be greater than zero.",
    };
  }

  const { principal, fees, reserve } = allocation;

  if (
    !Number.isFinite(principal) ||
    !Number.isFinite(fees) ||
    !Number.isFinite(reserve)
  ) {
    return {
      isValid: false,
      totalAllocated: 0,
      difference: paymentAmount,
      errorReason: "Allocation amounts must be valid finite numbers.",
    };
  }

  if (principal < 0 || fees < 0 || reserve < 0) {
    return {
      isValid: false,
      totalAllocated: Number((principal + fees + reserve).toFixed(4)),
      difference: Number((paymentAmount - (principal + fees + reserve)).toFixed(4)),
      errorReason: "Allocation amounts cannot be negative.",
    };
  }

  const totalAllocated = Number((principal + fees + reserve).toFixed(4));
  const diff = Number((paymentAmount - totalAllocated).toFixed(4));

  if (Math.abs(diff) < 0.0001) {
    return {
      isValid: true,
      totalAllocated,
      difference: 0,
      errorReason: null,
    };
  }

  if (diff < 0) {
    return {
      isValid: false,
      totalAllocated,
      difference: diff,
      errorReason: `Allocation exceeds payment by ${Math.abs(diff).toFixed(4)} XLM (over-allocated).`,
    };
  }

  return {
    isValid: false,
    totalAllocated,
    difference: diff,
    errorReason: `Allocation has ${diff.toFixed(4)} XLM unassigned (under-allocated).`,
  };
}

/**
 * Computes pro-rata investor distributions for principal and fees.
 * Acceptance criteria: Preview reconciles to investor payouts; Fees are separate from principal.
 */
export function calculateDistributionPreview(
  context: PartialPaymentContext,
  allocation: AllocationBreakdown,
): DistributionPreview {
  const { positions } = context;
  const { principal, fees, reserve } = allocation;

  let totalPrincipalDistributed = 0;
  let totalFeesDistributed = 0;

  const distributionPositions: PerPositionDistribution[] = positions.map((pos) => {
    const principalPayout = Number((principal * pos.principal_share_ratio).toFixed(4));
    const feePayout = Number((fees * pos.principal_share_ratio).toFixed(4));
    const totalPayout = Number((principalPayout + feePayout).toFixed(4));

    totalPrincipalDistributed += principalPayout;
    totalFeesDistributed += feePayout;

    return {
      investor_address: pos.address,
      invested_principal: pos.invested_principal,
      principal_share_ratio: pos.principal_share_ratio,
      principal_payout: principalPayout,
      fee_payout: feePayout,
      total_payout: totalPayout,
    };
  });

  totalPrincipalDistributed = Number(totalPrincipalDistributed.toFixed(4));
  totalFeesDistributed = Number(totalFeesDistributed.toFixed(4));
  const totalInvestorPayouts = Number((totalPrincipalDistributed + totalFeesDistributed).toFixed(4));

  // Reconciles if sum of investor payouts + reserve equals total allocated within rounding precision
  const expectedTotal = Number((principal + fees).toFixed(4));
  const isReconciled = Math.abs(totalInvestorPayouts - expectedTotal) < 0.01;

  return {
    positions: distributionPositions,
    totalPrincipalDistributed,
    totalFeesDistributed,
    totalInvestorPayouts,
    reserveRetained: reserve,
    isReconciled,
  };
}

/**
 * Generates an immutable settlement receipt matching the approved allocation.
 * Acceptance criteria: Receipts match approval; Approval state is visible.
 */
export function createSettlementReceipt(
  context: PartialPaymentContext,
  allocation: AllocationBreakdown,
  approval: SettlementApprovalState,
  txHash?: string,
): SettlementReceipt {
  if (approval.status !== "approved" || !approval.approver_address) {
    throw new Error("Cannot generate settlement receipt without authorized approval.");
  }

  const preview = calculateDistributionPreview(context, allocation);

  return {
    receipt_id: `rcpt-${Date.now()}-${context.invoice_id}`,
    invoice_id: context.invoice_id,
    invoice_title: context.invoice_title,
    total_payment_received: context.partial_payment_amount,
    allocation: { ...allocation },
    distribution_summary: {
      investor_total: preview.totalInvestorPayouts,
      reserve_retained: allocation.reserve,
      investor_count: context.positions.length,
    },
    approved_by: approval.approver_address,
    approved_at: approval.approved_at ?? new Date().toISOString(),
    tx_hash: txHash ?? `tx_settle_${Date.now()}`,
    status: "finalized",
  };
}
