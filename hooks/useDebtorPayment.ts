"use client";

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  DebtorPaymentInvoice,
  RawInvoiceWithInternalPositions,
  sanitizePublicDebtorPaymentData,
  encodePaymentQrUri,
  applyPaymentConfirmation,
} from "@/lib/analytics/debtorPayment";

const DEFAULT_MOCK_RAW: RawInvoiceWithInternalPositions = {
  invoice_id: "inv-debtor-882",
  invoice_title: "CleanTech Solar Equipment Receivables Net 60",
  debtor_name: "Lumina Power Infrastructure Inc",
  debtor_address: "GBDEBTOR_LUMINA_POWER_CORP_ADDR",
  currency: "USDC",
  total_due_amount: 15000,
  amount_paid: 5000,
  payment_reference: "REF-LUMINA-2026-N60",
  destination_address: "GBSCROW_LUMINA_SETTLEMENT_VAULT",
  due_date: "2026-12-20T23:59:59Z",
  investors: [
    { address: "GBINTERNAL_INVESTOR_1", invested_amount: 10000, share_percent: 66.67 },
    { address: "GBINTERNAL_INVESTOR_2", invested_amount: 5000, share_percent: 33.33 },
  ],
  payments_history: [
    {
      tx_hash: "tx_init_partial_001",
      amount: 5000,
      timestamp: "2026-11-15T14:30:00Z",
    },
  ],
};

export function useDebtorPayment(
  initialRaw: RawInvoiceWithInternalPositions = DEFAULT_MOCK_RAW,
) {
  // Always sanitize upon initialization to ensure private position data is excluded
  const [invoice, setInvoice] = useState<DebtorPaymentInvoice>(() =>
    sanitizePublicDebtorPaymentData(initialRaw),
  );

  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Computes safe SEP-0007 QR code URI
  const qrUri = useMemo(() => {
    return encodePaymentQrUri(
      invoice.destination_address,
      invoice.remaining_amount,
      invoice.currency,
      invoice.payment_reference,
    );
  }, [
    invoice.destination_address,
    invoice.remaining_amount,
    invoice.currency,
    invoice.payment_reference,
  ]);

  // Copy helper with feedback
  const copyToClipboard = useCallback(async (text: string, fieldName: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      setCopiedField(fieldName);
      toast.success(`${fieldName} copied to clipboard!`);
      setTimeout(() => {
        setCopiedField((curr) => (curr === fieldName ? null : curr));
      }, 2000);
    } catch {
      toast.error(`Failed to copy ${fieldName}`);
    }
  }, []);

  // Payment confirmation (simulated or real on-chain callback)
  const confirmPayment = useCallback(
    (amount: number, txHash?: string) => {
      try {
        const updated = applyPaymentConfirmation(invoice, amount, txHash);
        setInvoice(updated);
        if (updated.status === "settled") {
          toast.success("Payment fully settled! Receipt finalized.");
        } else {
          toast.info(`Partial payment of ${amount} ${invoice.currency} recorded.`);
        }
        return updated;
      } catch (err: any) {
        toast.error(err.message || "Failed to confirm payment");
      }
    },
    [invoice],
  );

  return {
    invoice,
    qrUri,
    copiedField,
    copyToClipboard,
    confirmPayment,
  };
}
