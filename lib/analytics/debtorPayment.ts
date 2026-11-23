/**
 * Debtor payment landing page analytics and privacy sanitization engine (#680).
 *
 * Implements public payment parameters, copyable references, safe QR encoding,
 * status calculation (due, partial, settled), and strict exclusion of investor
 * identities and balances.
 */

export type DebtorPaymentStatus = "due" | "partial" | "settled";

export interface DebtorPaymentInvoice {
  invoice_id: string;
  invoice_title: string;
  debtor_name: string;
  debtor_address: string;
  currency: "XLM" | "USDC";
  total_due_amount: number;
  amount_paid: number;
  remaining_amount: number;
  payment_reference: string;
  destination_address: string;
  due_date: string;
  status: DebtorPaymentStatus;
  payments_history?: Array<{
    tx_hash: string;
    amount: number;
    timestamp: string;
  }>;
}

export interface RawInvoiceWithInternalPositions {
  invoice_id: string;
  invoice_title: string;
  debtor_name: string;
  debtor_address: string;
  currency?: "XLM" | "USDC";
  total_due_amount: number;
  amount_paid?: number;
  payment_reference: string;
  destination_address: string;
  due_date: string;
  // Internal private position data that MUST be excluded from public view
  investors?: Array<{
    address: string;
    invested_amount: number;
    share_percent: number;
  }>;
  internal_yield_rates?: number[];
  internal_escrow_private_keys?: string[];
  payments_history?: Array<{
    tx_hash: string;
    amount: number;
    timestamp: string;
  }>;
}

/**
 * Sanitizes invoice data for public debtor view.
 * Acceptance criteria: Confirmation hides private position data; Payment links use approved public data.
 */
export function sanitizePublicDebtorPaymentData(
  raw: RawInvoiceWithInternalPositions,
): DebtorPaymentInvoice {
  const amountPaid = Number(Math.max(0, raw.amount_paid ?? 0).toFixed(4));
  const totalDue = Number(Math.max(0, raw.total_due_amount).toFixed(4));
  const remaining = Number(Math.max(0, totalDue - amountPaid).toFixed(4));

  let status: DebtorPaymentStatus = "due";
  if (remaining <= 0) {
    status = "settled";
  } else if (amountPaid > 0) {
    status = "partial";
  }

  // Pure public data: strictly exclude any investor identities, balances or shares
  return {
    invoice_id: raw.invoice_id,
    invoice_title: raw.invoice_title,
    debtor_name: raw.debtor_name,
    debtor_address: raw.debtor_address,
    currency: raw.currency ?? "XLM",
    total_due_amount: totalDue,
    amount_paid: amountPaid,
    remaining_amount: remaining,
    payment_reference: raw.payment_reference,
    destination_address: raw.destination_address,
    due_date: raw.due_date,
    status,
    payments_history: raw.payments_history ? [...raw.payments_history] : [],
  };
}

/**
 * Encodes a safe Stellar payment URI (SEP-0007 compliant) for QR representation.
 * Acceptance criteria: QR encodes the configured destination safely.
 */
export function encodePaymentQrUri(
  destination: string,
  amount: number,
  currency: string,
  reference: string,
): string {
  const cleanDest = destination.trim();
  const cleanRef = encodeURIComponent(reference.trim());
  const formattedAmount = amount > 0 ? amount.toFixed(2) : "0.00";

  // Standard safe Stellar SEP-0007 payment URI
  return `web+stellar:pay?destination=${cleanDest}&amount=${formattedAmount}&asset_code=${currency}&memo=${cleanRef}&memo_type=MEMO_TEXT`;
}

/**
 * Calculates updated payment state following a partial or final payment confirmation.
 * Acceptance criteria: Support partial and final confirmation; Remaining amount is visible.
 */
export function applyPaymentConfirmation(
  current: DebtorPaymentInvoice,
  paymentAmount: number,
  txHash: string = `tx_${Date.now()}`,
  timestamp: string = new Date().toISOString(),
): DebtorPaymentInvoice {
  if (paymentAmount <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }

  const newAmountPaid = Number((current.amount_paid + paymentAmount).toFixed(4));
  const newRemaining = Number(Math.max(0, current.total_due_amount - newAmountPaid).toFixed(4));

  const newStatus: DebtorPaymentStatus =
    newRemaining <= 0 ? "settled" : "partial";

  const updatedHistory = [
    ...(current.payments_history ?? []),
    {
      tx_hash: txHash,
      amount: paymentAmount,
      timestamp,
    },
  ];

  return {
    ...current,
    amount_paid: newAmountPaid,
    remaining_amount: newRemaining,
    status: newStatus,
    payments_history: updatedHistory,
  };
}
