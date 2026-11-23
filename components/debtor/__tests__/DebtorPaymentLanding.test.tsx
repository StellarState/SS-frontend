import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DebtorPaymentLanding } from "../DebtorPaymentLanding";
import { RawInvoiceWithInternalPositions } from "@/lib/analytics/debtorPayment";

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock react-qr-code
vi.mock("react-qr-code", () => ({
  default: ({ value }: { value: string }) => <div data-testid="mock-qr-svg">{value}</div>,
}));

describe("DebtorPaymentLanding (#680)", () => {
  const mockInvoiceData: RawInvoiceWithInternalPositions = {
    invoice_id: "inv-debtor-test-01",
    invoice_title: "CleanTech Solar Equipment Receivables",
    debtor_name: "Lumina Power Infrastructure Inc",
    debtor_address: "GBDEBTOR_LUMINA_POWER_CORP_ADDR",
    currency: "USDC",
    total_due_amount: 10000,
    amount_paid: 0,
    payment_reference: "REF-LUMINA-2026-X88",
    destination_address: "GBSCROW_SETTLEMENT_VAULT",
    due_date: "2026-12-25T00:00:00Z",
    // Private data to test exclusion
    investors: [
      { address: "GBSECRET_WHALE_INVESTOR_1", invested_amount: 7000, share_percent: 70 },
      { address: "GBSECRET_WHALE_INVESTOR_2", invested_amount: 3000, share_percent: 30 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("renders in initial 'due' state with amounts, due date, and reference", () => {
    render(<DebtorPaymentLanding initialRawInvoice={mockInvoiceData} />);

    expect(screen.getByTestId("debtor-payment-landing-page")).toBeInTheDocument();
    expect(screen.getByTestId("badge-status-due")).toHaveTextContent("Payment Due");
    expect(screen.getByTestId("metric-total-due")).toHaveTextContent("10,000 USDC");
    expect(screen.getByTestId("metric-remaining-amount")).toHaveTextContent("10,000 USDC");
    expect(screen.getByText("REF-LUMINA-2026-X88")).toBeInTheDocument();
  });

  it("renders QR code encoding configured destination and safe URI", () => {
    render(<DebtorPaymentLanding initialRawInvoice={mockInvoiceData} />);

    const qrElement = screen.getByTestId("mock-qr-svg");
    expect(qrElement).toBeInTheDocument();
    expect(qrElement).toHaveTextContent("web+stellar:pay?destination=GBSCROW_SETTLEMENT_VAULT");
    expect(qrElement).toHaveTextContent("memo=REF-LUMINA-2026-X88");
  });

  it("copies amount and reference when copy buttons are clicked", async () => {
    render(<DebtorPaymentLanding initialRawInvoice={mockInvoiceData} />);

    // Copy amount
    const copyAmountBtn = screen.getByTestId("copy-amount-btn");
    fireEvent.click(copyAmountBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("10000.00");

    // Copy reference
    const copyRefBtn = screen.getByTestId("copy-ref-btn");
    fireEvent.click(copyRefBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("REF-LUMINA-2026-X88");
  });

  it("supports partial payment confirmation and updates remaining amount and state", () => {
    render(<DebtorPaymentLanding initialRawInvoice={mockInvoiceData} />);

    // Confirm partial payment of 4000
    const inputAmount = screen.getByTestId("input-confirm-amount");
    fireEvent.change(inputAmount, { target: { value: "4000" } });

    const confirmPartialBtn = screen.getByTestId("btn-confirm-partial");
    fireEvent.click(confirmPartialBtn);

    // Status transitions to partial
    expect(screen.getByTestId("badge-status-partial")).toHaveTextContent("Partially Paid");
    expect(screen.getByTestId("metric-amount-paid")).toHaveTextContent("4,000 USDC");
    expect(screen.getByTestId("metric-remaining-amount")).toHaveTextContent("6,000 USDC");
  });

  it("supports final payment confirmation and transitions to settled receipt", () => {
    render(<DebtorPaymentLanding initialRawInvoice={mockInvoiceData} />);

    // Click confirm full payment
    const confirmFinalBtn = screen.getByTestId("btn-confirm-final");
    fireEvent.click(confirmFinalBtn);

    // Status transitions to settled
    expect(screen.getByTestId("badge-status-settled")).toHaveTextContent("Fully Settled");
    expect(screen.getByTestId("metric-remaining-amount")).toHaveTextContent("0 USDC");
    expect(screen.getByTestId("settled-receipt-card")).toBeInTheDocument();
  });

  it("strictly excludes private investor identities and fractional balances from DOM", () => {
    render(<DebtorPaymentLanding initialRawInvoice={mockInvoiceData} />);

    const containerText = screen.getByTestId("debtor-payment-landing-page").textContent;

    // Must NOT contain private investor addresses or balances
    expect(containerText).not.toContain("GBSECRET_WHALE_INVESTOR_1");
    expect(containerText).not.toContain("GBSECRET_WHALE_INVESTOR_2");
    expect(containerText).not.toContain("70%");
    expect(containerText).not.toContain("7,000");
  });
});
