import { describe, it, expect } from "vitest";
import {
  sanitizePublicDebtorPaymentData,
  encodePaymentQrUri,
  applyPaymentConfirmation,
  RawInvoiceWithInternalPositions,
} from "../debtorPayment";

describe("Debtor Payment Landing Page Analytics (#680)", () => {
  const mockRawInvoice: RawInvoiceWithInternalPositions = {
    invoice_id: "inv-debtor-101",
    invoice_title: "SolarGrid Power Modules Receivable",
    debtor_name: "Helios Energy Ltd",
    debtor_address: "GBDEBTOR_HELIOS_CORP",
    currency: "USDC",
    total_due_amount: 5000,
    amount_paid: 0,
    payment_reference: "REF-SOLAR-2026-X1",
    destination_address: "GBESCROW_SETTLEMENT_DESTINATION",
    due_date: "2026-12-15T00:00:00Z",
    // Private internal position data that must NOT be leaked
    investors: [
      { address: "GBSECRET_INVESTOR_1", invested_amount: 3000, share_percent: 60 },
      { address: "GBSECRET_INVESTOR_2", invested_amount: 2000, share_percent: 40 },
    ],
    internal_yield_rates: [14.5, 15.0],
    internal_escrow_private_keys: ["S_PRIVATE_KEY_NEVER_REVEAL"],
  };

  describe("sanitizePublicDebtorPaymentData", () => {
    it("excludes private investor identities and internal balances completely", () => {
      const publicData = sanitizePublicDebtorPaymentData(mockRawInvoice);

      // Public fields exist
      expect(publicData.invoice_id).toBe("inv-debtor-101");
      expect(publicData.debtor_name).toBe("Helios Energy Ltd");
      expect(publicData.total_due_amount).toBe(5000);
      expect(publicData.remaining_amount).toBe(5000);
      expect(publicData.status).toBe("due");

      // Internal fields are absent
      expect((publicData as any).investors).toBeUndefined();
      expect((publicData as any).internal_yield_rates).toBeUndefined();
      expect((publicData as any).internal_escrow_private_keys).toBeUndefined();
    });

    it("correctly identifies partial payment state", () => {
      const partialData = sanitizePublicDebtorPaymentData({
        ...mockRawInvoice,
        amount_paid: 2000,
      });

      expect(partialData.amount_paid).toBe(2000);
      expect(partialData.remaining_amount).toBe(3000);
      expect(partialData.status).toBe("partial");
    });

    it("correctly identifies fully settled state", () => {
      const settledData = sanitizePublicDebtorPaymentData({
        ...mockRawInvoice,
        amount_paid: 5000,
      });

      expect(settledData.amount_paid).toBe(5000);
      expect(settledData.remaining_amount).toBe(0);
      expect(settledData.status).toBe("settled");
    });
  });

  describe("encodePaymentQrUri", () => {
    it("encodes standard SEP-0007 compliant payment URI with destination, amount and memo", () => {
      const uri = encodePaymentQrUri(
        "GBESCROW_SETTLEMENT_DESTINATION",
        3000,
        "USDC",
        "REF-SOLAR-2026-X1",
      );

      expect(uri).toContain("web+stellar:pay");
      expect(uri).toContain("destination=GBESCROW_SETTLEMENT_DESTINATION");
      expect(uri).toContain("amount=3000.00");
      expect(uri).toContain("asset_code=USDC");
      expect(uri).toContain("memo=REF-SOLAR-2026-X1");
      expect(uri).toContain("memo_type=MEMO_TEXT");
    });
  });

  describe("applyPaymentConfirmation", () => {
    const initialPublic = sanitizePublicDebtorPaymentData(mockRawInvoice);

    it("updates status to partial and records transaction when partial payment is confirmed", () => {
      const updated = applyPaymentConfirmation(
        initialPublic,
        2000,
        "tx_partial_123",
        "2026-11-22T10:00:00Z",
      );

      expect(updated.amount_paid).toBe(2000);
      expect(updated.remaining_amount).toBe(3000);
      expect(updated.status).toBe("partial");
      expect(updated.payments_history).toHaveLength(1);
      expect(updated.payments_history?.[0].tx_hash).toBe("tx_partial_123");
      expect(updated.payments_history?.[0].amount).toBe(2000);
    });

    it("updates status to settled when final balance is fully paid", () => {
      const partial = applyPaymentConfirmation(initialPublic, 2000, "tx_1");
      const settled = applyPaymentConfirmation(partial, 3000, "tx_2");

      expect(settled.amount_paid).toBe(5000);
      expect(settled.remaining_amount).toBe(0);
      expect(settled.status).toBe("settled");
      expect(settled.payments_history).toHaveLength(2);
    });

    it("rejects non-positive payment amounts", () => {
      expect(() => applyPaymentConfirmation(initialPublic, 0)).toThrow(
        "Payment amount must be greater than zero",
      );
      expect(() => applyPaymentConfirmation(initialPublic, -100)).toThrow(
        "Payment amount must be greater than zero",
      );
    });
  });
});
