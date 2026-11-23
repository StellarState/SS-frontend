import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InvoiceDocumentExpiryAlert } from "@/components/invoices/InvoiceDocumentExpiryAlert";
import { DocumentRenewalModal } from "@/components/invoices/DocumentRenewalModal";
import type { DocumentExpiryMetadata } from "@/lib/invoiceDocumentExpiry";

describe("InvoiceDocumentExpiryAlert and DocumentRenewalModal (#658)", () => {
  const baseDate = new Date("2026-06-01T12:00:00Z");

  const expiringDoc: DocumentExpiryMetadata = {
    id: "doc-1",
    invoiceId: "inv-1",
    documentUrl: "ipfs://bafy-expiring",
    name: "Supplier Invoice",
    isMandatory: true,
    expiresAt: new Date("2026-06-10T12:00:00Z").toISOString(), // in 9 days
    gracePeriodDays: 7,
    remindersSent: ["14_days"],
    auditHistory: [
      {
        id: "audit-1",
        action: "uploaded",
        timestamp: "2026-01-01T00:00:00Z",
        actor: "issuer_initial",
      },
    ],
  };

  const expiredMandatoryDoc: DocumentExpiryMetadata = {
    id: "doc-2",
    invoiceId: "inv-1",
    documentUrl: "ipfs://bafy-expired",
    name: "Commercial Contract",
    isMandatory: true,
    expiresAt: new Date("2026-05-28T12:00:00Z").toISOString(), // 4 days ago (grace period)
    gracePeriodDays: 7,
    remindersSent: ["30_days", "14_days", "3_days", "expired"],
    auditHistory: [
      {
        id: "audit-1",
        action: "uploaded",
        timestamp: "2026-01-01T00:00:00Z",
        actor: "issuer_initial",
      },
    ],
  };

  it("renders warning banner when document is expiring soon", () => {
    render(<InvoiceDocumentExpiryAlert documents={[expiringDoc]} now={baseDate} />);

    expect(screen.getByTestId("document-warning-alert")).toBeInTheDocument();
    expect(screen.getByText(/Supplier Invoice/)).toBeInTheDocument();
    expect(screen.getByText(/14-day reminder/)).toBeInTheDocument();
  });

  it("renders destructive funding paused alert when mandatory document is expired in grace period", () => {
    render(
      <InvoiceDocumentExpiryAlert
        documents={[expiringDoc, expiredMandatoryDoc]}
        now={baseDate}
      />,
    );

    expect(screen.getByTestId("funding-blocked-alert")).toBeInTheDocument();
    expect(screen.getByText(/Commercial Contract/)).toBeInTheDocument();
    expect(screen.getByText(/Grace period active/)).toBeInTheDocument();
    expect(screen.getByText(/Funding on this invoice is paused/)).toBeInTheDocument();
  });

  it("opens DocumentRenewalModal, displays audit history, and submits renewal", async () => {
    const handleRenew = vi.fn();

    render(
      <DocumentRenewalModal
        meta={expiringDoc}
        userAddress="G_ISSUER_123"
        onRenew={handleRenew}
      />,
    );

    // Click trigger
    fireEvent.click(screen.getByTestId("renew-doc-doc-1"));
    expect(screen.getByText("Renew Supporting Document")).toBeInTheDocument();

    // Toggle audit history
    fireEvent.click(screen.getByTestId("toggle-audit-history"));
    expect(screen.getByTestId("audit-history-list")).toBeInTheDocument();
    expect(screen.getByText(/issuer_initial/)).toBeInTheDocument();

    // Toggle back to form
    fireEvent.click(screen.getByTestId("toggle-audit-history"));

    // Fill form
    fireEvent.change(screen.getByTestId("renew-doc-url"), {
      target: { value: "ipfs://bafy-renewed-v2" },
    });
    fireEvent.change(screen.getByTestId("renew-doc-expiry"), {
      target: { value: "2027-06-01" },
    });
    fireEvent.change(screen.getByTestId("renew-doc-notes"), {
      target: { value: "Updated contract signed by both parties" },
    });

    fireEvent.click(screen.getByTestId("submit-renewal-btn"));

    await waitFor(() => {
      expect(handleRenew).toHaveBeenCalledWith(
        expect.objectContaining({
          documentUrl: "ipfs://bafy-renewed-v2",
          status: "renewed",
          auditHistory: expect.arrayContaining([
            expect.objectContaining({
              action: "uploaded",
              actor: "issuer_initial",
            }),
            expect.objectContaining({
              action: "renewed",
              actor: "G_ISSUER_123",
              notes: "Updated contract signed by both parties",
            }),
          ]),
        }),
      );
    });
  });
});
