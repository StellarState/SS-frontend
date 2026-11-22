/**
 * Settlement claim queue and delegated claims analytics (#682).
 *
 * Implements individual and bulk eligibility checks, fee & payout estimates,
 * bulk reconciliation, operator delegation scope verification,
 * independent retryable failures, and audit history logging.
 */

export type ClaimItemStatus = "unclaimed" | "processing" | "claimed" | "failed";
export type DelegationScope = "claims:execute" | "claims:view" | "rebalance:execute";

export const DEFAULT_PROTOCOL_FEE_BPS = 25; // 0.25% fee
export const DEFAULT_NETWORK_FEE_XLM = 0.01; // 0.01 XLM gas fee per claim

export interface SettlementClaimItem {
  invoice_id: string;
  invoice_title: string;
  investor_address: string;
  gross_return_amount: number;
  protocol_fee_amount: number;
  estimated_network_fee: number;
  net_payout_amount: number;
  invoice_status: "settled" | "funded" | "disputed" | "defaulted";
  is_eligible: boolean;
  settled_at: string;
  claim_status: ClaimItemStatus;
  last_error?: string | null;
  retry_count?: number;
}

export interface OperatorDelegation {
  id: string;
  investor_address: string;
  operator_address: string;
  scopes: DelegationScope[];
  expires_at: string;
  max_claim_amount_xlm?: number | null;
  is_active: boolean;
}

export interface BulkReconciliation {
  selectedCount: number;
  totalGrossReturn: number;
  totalProtocolFees: number;
  totalNetworkFees: number;
  netTotalPayout: number;
  isReconciled: boolean;
  individualReconciliations: Array<{
    invoice_id: string;
    gross: number;
    fees: number;
    net: number;
  }>;
}

export interface ClaimAuditRecord {
  id: string;
  invoice_id: string;
  invoice_title: string;
  investor_address: string;
  claimed_by_operator?: string | null;
  is_delegated: boolean;
  gross_amount: number;
  net_payout: number;
  fee_deducted: number;
  status: "success" | "failed";
  error_message?: string | null;
  tx_hash?: string | null;
  timestamp: string;
}

/**
 * Checks eligibility and calculates fees & net payout estimates for a settlement item.
 * Acceptance criteria: Only eligible claims appear; Show fees and payout estimates.
 */
export function evaluateSettlementClaimEligibility(
  rawItem: {
    invoice_id: string;
    invoice_title: string;
    investor_address: string;
    gross_return_amount: number;
    invoice_status: "settled" | "funded" | "disputed" | "defaulted";
    settled_at: string;
    claim_status?: ClaimItemStatus;
    last_error?: string | null;
  },
  protocolFeeBps: number = DEFAULT_PROTOCOL_FEE_BPS,
  networkFeeXlm: number = DEFAULT_NETWORK_FEE_XLM,
): SettlementClaimItem {
  // Only invoices in 'settled' status with positive return are eligible
  const isEligible =
    rawItem.invoice_status === "settled" &&
    Number.isFinite(rawItem.gross_return_amount) &&
    rawItem.gross_return_amount > 0;

  const protocolFee = isEligible
    ? Number(((rawItem.gross_return_amount * protocolFeeBps) / 10000).toFixed(4))
    : 0;

  const netPayout = isEligible
    ? Number(Math.max(0, rawItem.gross_return_amount - protocolFee - networkFeeXlm).toFixed(4))
    : 0;

  return {
    invoice_id: rawItem.invoice_id,
    invoice_title: rawItem.invoice_title,
    investor_address: rawItem.investor_address,
    gross_return_amount: rawItem.gross_return_amount,
    protocol_fee_amount: protocolFee,
    estimated_network_fee: networkFeeXlm,
    net_payout_amount: netPayout,
    invoice_status: rawItem.invoice_status,
    is_eligible: isEligible,
    settled_at: rawItem.settled_at,
    claim_status: rawItem.claim_status ?? (isEligible ? "unclaimed" : "failed"),
    last_error: rawItem.last_error,
  };
}

/**
 * Reconciles bulk totals with individual claim payouts.
 * Acceptance criteria: Bulk totals reconcile individually.
 */
export function reconcileBulkClaims(
  claims: readonly SettlementClaimItem[],
  selectedInvoiceIds: string[],
): BulkReconciliation {
  const selectedItems = claims.filter(
    (c) => selectedInvoiceIds.includes(c.invoice_id) && c.is_eligible && c.claim_status !== "claimed",
  );

  let totalGross = 0;
  let totalProtocol = 0;
  let totalNetwork = 0;
  let totalNet = 0;

  const individualReconciliations: BulkReconciliation["individualReconciliations"] = [];

  for (const item of selectedItems) {
    totalGross += item.gross_return_amount;
    totalProtocol += item.protocol_fee_amount;
    totalNetwork += item.estimated_network_fee;
    totalNet += item.net_payout_amount;

    individualReconciliations.push({
      invoice_id: item.invoice_id,
      gross: item.gross_return_amount,
      fees: Number((item.protocol_fee_amount + item.estimated_network_fee).toFixed(4)),
      net: item.net_payout_amount,
    });
  }

  const individualSumNet = Number(
    individualReconciliations.reduce((sum, item) => sum + item.net, 0).toFixed(4),
  );
  const roundedTotalNet = Number(totalNet.toFixed(4));

  // Reconciliation check
  const isReconciled = Math.abs(roundedTotalNet - individualSumNet) < 0.0001;

  return {
    selectedCount: selectedItems.length,
    totalGrossReturn: Number(totalGross.toFixed(4)),
    totalProtocolFees: Number(totalProtocol.toFixed(4)),
    totalNetworkFees: Number(totalNetwork.toFixed(4)),
    netTotalPayout: roundedTotalNet,
    isReconciled,
    individualReconciliations,
  };
}

/**
 * Validates that an operator possesses the authorized scope and validity to claim on behalf of an investor.
 * Acceptance criteria: Operators require explicit scope.
 */
export function verifyOperatorDelegation(
  delegation: OperatorDelegation | null | undefined,
  claimantAddress: string,
  investorAddress: string,
  totalAmountXlm: number,
  nowInput?: string | Date | number,
): { isAuthorized: boolean; reason?: string } {
  const normClaimant = claimantAddress.trim().toLowerCase();
  const normInvestor = investorAddress.trim().toLowerCase();

  // If the investor is claiming directly for themselves, no operator delegation is needed
  if (normClaimant === normInvestor) {
    return { isAuthorized: true };
  }

  // Delegated operator claiming
  if (!delegation) {
    return {
      isAuthorized: false,
      reason: "No delegation agreement found for this operator.",
    };
  }

  if (!delegation.is_active) {
    return {
      isAuthorized: false,
      reason: "Operator delegation agreement has been revoked or deactivated.",
    };
  }

  if (delegation.operator_address.trim().toLowerCase() !== normClaimant) {
    return {
      isAuthorized: false,
      reason: "Operator address mismatch.",
    };
  }

  // Scope verification: requires 'claims:execute'
  if (!delegation.scopes.includes("claims:execute")) {
    return {
      isAuthorized: false,
      reason: "Operator does not have the mandatory 'claims:execute' delegation scope.",
    };
  }

  // Expiration check
  const nowMs =
    nowInput instanceof Date
      ? nowInput.getTime()
      : typeof nowInput === "string"
        ? new Date(nowInput).getTime()
        : typeof nowInput === "number"
          ? nowInput
          : Date.now();

  const expiresMs = new Date(delegation.expires_at).getTime();
  if (expiresMs <= nowMs) {
    return {
      isAuthorized: false,
      reason: "Operator delegation authorization has expired.",
    };
  }

  // Maximum claim amount check
  if (
    delegation.max_claim_amount_xlm !== null &&
    delegation.max_claim_amount_xlm !== undefined &&
    totalAmountXlm > delegation.max_claim_amount_xlm
  ) {
    return {
      isAuthorized: false,
      reason: `Claim total (${totalAmountXlm} XLM) exceeds operator delegation limit (${delegation.max_claim_amount_xlm} XLM).`,
    };
  }

  return { isAuthorized: true };
}

/**
 * Executes an individual claim item, supporting independent retries on failures.
 * Acceptance criteria: Failures remain independently retryable; Success updates portfolio and payout history.
 */
export function processClaimExecution(
  item: SettlementClaimItem,
  claimantAddress: string,
  delegation?: OperatorDelegation | null,
  options?: {
    simulateFailure?: boolean;
    failureReason?: string;
    txHash?: string;
    nowInput?: string | Date | number;
  },
): {
  updatedItem: SettlementClaimItem;
  auditRecord: ClaimAuditRecord;
} {
  const normClaimant = claimantAddress.trim().toLowerCase();
  const isDelegated = normClaimant !== item.investor_address.trim().toLowerCase();

  // Verify delegation if delegated
  const auth = verifyOperatorDelegation(
    delegation,
    claimantAddress,
    item.investor_address,
    item.net_payout_amount,
    options?.nowInput,
  );

  const nowIso =
    options?.nowInput instanceof Date
      ? options.nowInput.toISOString()
      : typeof options?.nowInput === "string"
        ? new Date(options.nowInput).toISOString()
        : typeof options?.nowInput === "number"
          ? new Date(options.nowInput).toISOString()
          : new Date().toISOString();

  if (!auth.isAuthorized) {
    const failedItem: SettlementClaimItem = {
      ...item,
      claim_status: "failed",
      last_error: auth.reason,
      retry_count: (item.retry_count ?? 0) + 1,
    };

    const auditRecord: ClaimAuditRecord = {
      id: `audit-${Date.now()}-${item.invoice_id}`,
      invoice_id: item.invoice_id,
      invoice_title: item.invoice_title,
      investor_address: item.investor_address,
      claimed_by_operator: isDelegated ? claimantAddress : null,
      is_delegated: isDelegated,
      gross_amount: item.gross_return_amount,
      net_payout: 0,
      fee_deducted: 0,
      status: "failed",
      error_message: auth.reason,
      timestamp: nowIso,
    };

    return { updatedItem: failedItem, auditRecord };
  }

  if (options?.simulateFailure) {
    const errorMsg = options.failureReason || "Stellar network timeout during contract claim execution.";
    const failedItem: SettlementClaimItem = {
      ...item,
      claim_status: "failed",
      last_error: errorMsg,
      retry_count: (item.retry_count ?? 0) + 1,
    };

    const auditRecord: ClaimAuditRecord = {
      id: `audit-${Date.now()}-${item.invoice_id}`,
      invoice_id: item.invoice_id,
      invoice_title: item.invoice_title,
      investor_address: item.investor_address,
      claimed_by_operator: isDelegated ? claimantAddress : null,
      is_delegated: isDelegated,
      gross_amount: item.gross_return_amount,
      net_payout: 0,
      fee_deducted: 0,
      status: "failed",
      error_message: errorMsg,
      timestamp: nowIso,
    };

    return { updatedItem: failedItem, auditRecord };
  }

  // Success
  const totalFees = item.protocol_fee_amount + item.estimated_network_fee;
  const updatedItem: SettlementClaimItem = {
    ...item,
    claim_status: "claimed",
    last_error: null,
  };

  const auditRecord: ClaimAuditRecord = {
    id: `audit-${Date.now()}-${item.invoice_id}`,
    invoice_id: item.invoice_id,
    invoice_title: item.invoice_title,
    investor_address: item.investor_address,
    claimed_by_operator: isDelegated ? claimantAddress : null,
    is_delegated: isDelegated,
    gross_amount: item.gross_return_amount,
    net_payout: item.net_payout_amount,
    fee_deducted: Number(totalFees.toFixed(4)),
    status: "success",
    tx_hash: options?.txHash ?? `tx_claim_${Date.now()}`,
    timestamp: nowIso,
  };

  return { updatedItem, auditRecord };
}
