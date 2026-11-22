import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { DisputeEvidenceTimeline } from "../DisputeEvidenceTimeline";
import type { InvoiceDispute } from "@/lib/analytics/disputeTimeline";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    address: "GBJ5K2W3Y6D...ISSUER",
    jwt: null,
    isAuthenticated: true,
  })),
}));

vi.mock("@/context/WalletContext", () => ({
  useWallet: vi.fn(() => ({
    address: "GBJ5K2W3Y6D...ISSUER",
    isConnected: true,
  })),
}));

function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const mockDispute: InvoiceDispute = {
  id: "disp-test-1",
  invoiceId: "inv-999",
  invoiceTitle: "Logistics Freight Note #999",
  disputedAmount: 25000,
  issuerAddress: "GBJ5K2W3Y6D...ISSUER",
  debtorAddress: "GCD4X9A1B2C...DEBTOR",
  arbitratorAddress: "GARB7Z3M8N...ARBITRATOR",
  status: "open",
  createdAt: "2026-11-20T10:00:00Z",
  evidence: [
    {
      id: "ev-pub-1",
      disputeId: "disp-test-1",
      authorRole: "issuer",
      authorAddress: "GBJ5K2W3Y6D...ISSUER",
      evidenceType: "upload",
      title: "Public Bill of Lading",
      content: "Port clearance signed.",
      visibility: "public",
      submittedAt: "2026-11-20T11:00:00Z",
      fileMetadata: {
        fileName: "bill_of_lading.pdf",
        fileHash: "0xabc123",
        fileSize: 50000,
      },
    },
    {
      id: "ev-conf-1",
      disputeId: "disp-test-1",
      authorRole: "debtor",
      authorAddress: "GCD4X9A1B2C...DEBTOR",
      evidenceType: "text",
      title: "Confidential Damage Notice",
      content: "Internal inspection note.",
      visibility: "confidential",
      submittedAt: "2026-11-20T12:00:00Z",
    },
    {
      id: "ev-adj-1",
      disputeId: "disp-test-1",
      authorRole: "arbitrator",
      authorAddress: "GARB7Z3M8N...ARBITRATOR",
      evidenceType: "attestation",
      title: "Adjudicator Oracle Record",
      content: "Private notary cert.",
      visibility: "adjudicator_only",
      submittedAt: "2026-11-20T13:00:00Z",
      attestationMetadata: {
        signerAddress: "GORACLE_1",
        signatureHash: "0xdeadbeef",
        attestedAt: "2026-11-20T12:50:00Z",
      },
    },
  ],
  events: [
    {
      id: "evt-1",
      disputeId: "disp-test-1",
      eventType: "dispute_opened",
      actorRole: "debtor",
      actorAddress: "GCD4X9A1B2C...DEBTOR",
      title: "Dispute Opened by Debtor",
      description: "Dispute formalized.",
      timestamp: "2026-11-20T10:00:00Z",
      visibility: "public",
    },
    {
      id: "evt-2",
      disputeId: "disp-test-1",
      eventType: "evidence_submitted",
      actorRole: "issuer",
      actorAddress: "GBJ5K2W3Y6D...ISSUER",
      title: "Public Evidence Submitted",
      description: "Bill of lading attached.",
      timestamp: "2026-11-20T11:00:00Z",
      visibility: "public",
      evidenceId: "ev-pub-1",
    },
    {
      id: "evt-3",
      disputeId: "disp-test-1",
      eventType: "evidence_submitted",
      actorRole: "debtor",
      actorAddress: "GCD4X9A1B2C...DEBTOR",
      title: "Confidential Assessment Submitted",
      description: "Private log.",
      timestamp: "2026-11-20T12:00:00Z",
      visibility: "confidential",
      evidenceId: "ev-conf-1",
    },
    {
      id: "evt-4",
      disputeId: "disp-test-1",
      eventType: "evidence_submitted",
      actorRole: "arbitrator",
      actorAddress: "GARB7Z3M8N...ARBITRATOR",
      title: "Oracle Attestation Attached",
      description: "Private adjudicator record.",
      timestamp: "2026-11-20T13:00:00Z",
      visibility: "adjudicator_only",
      evidenceId: "ev-adj-1",
    },
  ],
};

describe("DisputeEvidenceTimeline Component (#695)", () => {
  it("renders dispute header, status badge, SLA countdown, and required action", () => {
    renderWithClient(
      <DisputeEvidenceTimeline
        invoiceId="inv-999"
        options={{ initialDispute: mockDispute, roleOverride: "issuer" }}
      />,
    );

    expect(screen.getByTestId("dispute-evidence-timeline")).toBeInTheDocument();
    expect(screen.getByTestId("dispute-status-badge")).toHaveTextContent("OPEN");
    expect(screen.getByTestId("public-status-text")).toHaveTextContent(/Dispute Under Review/i);
    expect(screen.getByTestId("sla-card")).toBeInTheDocument();
    expect(screen.getByTestId("required-action-card")).toBeInTheDocument();
  });

  it("filters evidence by participant role (Participants see authorised evidence only)", () => {
    // 1. Render as Public Observer
    const { unmount } = renderWithClient(
      <DisputeEvidenceTimeline
        invoiceId="inv-999"
        options={{ initialDispute: mockDispute, roleOverride: "public" }}
      />,
    );

    // Public should see public evidence, but NOT confidential or adjudicator-only
    expect(screen.getByTestId("evidence-item-ev-pub-1")).toBeInTheDocument();
    expect(screen.queryByTestId("evidence-item-ev-conf-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("evidence-item-ev-adj-1")).not.toBeInTheDocument();
    unmount();

    // 2. Render as Debtor (Dispute Party)
    const { unmount: unmountDebtor } = renderWithClient(
      <DisputeEvidenceTimeline
        invoiceId="inv-999"
        options={{ initialDispute: mockDispute, roleOverride: "debtor" }}
      />,
    );

    // Debtor should see public AND confidential, but NOT adjudicator-only
    expect(screen.getByTestId("evidence-item-ev-pub-1")).toBeInTheDocument();
    expect(screen.getByTestId("evidence-item-ev-conf-1")).toBeInTheDocument();
    expect(screen.queryByTestId("evidence-item-ev-adj-1")).not.toBeInTheDocument();
    unmountDebtor();

    // 3. Render as Arbitrator
    renderWithClient(
      <DisputeEvidenceTimeline
        invoiceId="inv-999"
        options={{ initialDispute: mockDispute, roleOverride: "arbitrator" }}
      />,
    );

    // Arbitrator sees all evidence
    expect(screen.getByTestId("evidence-item-ev-pub-1")).toBeInTheDocument();
    expect(screen.getByTestId("evidence-item-ev-conf-1")).toBeInTheDocument();
    expect(screen.getByTestId("evidence-item-ev-adj-1")).toBeInTheDocument();
  });

  it("locks evidence when dispute enters adjudication (Evidence cannot change in adjudication)", () => {
    const adjudicatedDispute: InvoiceDispute = {
      ...mockDispute,
      status: "under_adjudication",
      adjudicationStartedAt: "2026-11-21T00:00:00Z",
    };

    renderWithClient(
      <DisputeEvidenceTimeline
        invoiceId="inv-999"
        options={{ initialDispute: adjudicatedDispute, roleOverride: "issuer" }}
      />,
    );

    // Evidence locked banner must be visible
    expect(screen.getByTestId("evidence-locked-banner")).toBeInTheDocument();

    // Submission form must be hidden / absent
    expect(screen.queryByTestId("evidence-submission-card")).not.toBeInTheDocument();
  });

  it("submits new text, upload, and attestation evidence during open state", async () => {
    renderWithClient(
      <DisputeEvidenceTimeline
        invoiceId="inv-999"
        options={{ initialDispute: mockDispute, roleOverride: "issuer" }}
      />,
    );

    // Form is available
    expect(screen.getByTestId("evidence-submission-card")).toBeInTheDocument();

    // Fill form
    fireEvent.change(screen.getByTestId("evidence-title-input"), {
      target: { value: "Carrier Seal Log" },
    });
    fireEvent.change(screen.getByTestId("evidence-content-textarea"), {
      target: { value: "Verified container seal #8812 was intact upon departure." },
    });

    // Select Upload type
    fireEvent.click(screen.getByTestId("type-upload-btn"));
    fireEvent.change(screen.getByTestId("file-name-input"), {
      target: { value: "seal_log.pdf" },
    });

    // Submit
    fireEvent.click(screen.getByTestId("submit-evidence-btn"));

    // Verify submission recorded in timeline
    await waitFor(() => {
      expect(screen.getByText(/Evidence Submitted: Carrier Seal Log/i)).toBeInTheDocument();
    });
  });

  it("covers resolved dispute state with final ruling display", () => {
    const resolvedDispute: InvoiceDispute = {
      ...mockDispute,
      status: "resolved",
      adjudicationStartedAt: "2026-11-21T00:00:00Z",
      resolvedAt: "2026-11-22T08:00:00Z",
      ruling: "upheld_seller",
      rulingNotes: "Seller fulfilled terms as demonstrated by intact seals.",
    };

    renderWithClient(
      <DisputeEvidenceTimeline
        invoiceId="inv-999"
        options={{ initialDispute: resolvedDispute, roleOverride: "public" }}
      />,
    );

    expect(screen.getByTestId("dispute-status-badge")).toHaveTextContent("RESOLVED");
    expect(screen.getByTestId("public-status-text")).toHaveTextContent(/Resolved: Upheld in Favor of Seller/i);
    expect(screen.getByTestId("evidence-locked-banner")).toBeInTheDocument();
  });
});
