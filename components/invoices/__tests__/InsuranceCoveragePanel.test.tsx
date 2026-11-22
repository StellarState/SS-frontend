import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InsuranceCoveragePanel } from "../InsuranceCoveragePanel";
import type { InsurancePolicy, InsuranceClaim, EvidenceDocument } from "@/lib/analytics/insuranceCoverage";

const mockSubmitClaim = vi.fn();
const mockAdjudicateClaim = vi.fn();

vi.mock("@/hooks/useInsuranceCoverage", () => ({
  useInsurancePolicy: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
  })),
  useInsuranceClaims: vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
  })),
  useSubmitClaimMutation: vi.fn(() => ({
    mutate: mockSubmitClaim,
    isPending: false,
  })),
  useAdjudicateClaimMutation: vi.fn(() => ({
    mutate: mockAdjudicateClaim,
    isPending: false,
  })),
}));

describe("InsuranceCoveragePanel (#686)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const samplePolicy: InsurancePolicy = {
    id: "pol-1",
    invoice_id: "inv-100",
    invoice_face_value: 50000,
    provider_name: "StellarShield Mutual",
    policy_number: "SSM-500-2026",
    initial_coverage_limit: 50000,
    remaining_coverage_limit: 50000,
    coverage_ratio_percent: 100,
    deductible_amount: 1500,
    premium_bps: 120,
    premium_amount: 600,
    status: "active",
    effective_date: "2026-11-01T00:00:00Z",
    expiry_date: "2026-12-31T23:59:59Z",
    protection_level: "full",
    underwriter_address: "GBUNDERWRITER123",
  };

  const sampleEvidence: EvidenceDocument[] = [
    {
      id: "ev-1",
      file_name: "debtor_default_notice.pdf",
      file_hash: "QmHash123456789sha256",
      signed_by: "GBCLAIMANT999",
      signature: "sig_claimant_proof",
      uploaded_at: "2026-11-20T10:00:00Z",
      secure_view_url: "https://secure-docs.stellarsettle.app/view/ev-1",
    },
  ];

  const sampleClaim: InsuranceClaim = {
    id: "claim-1",
    policy_id: "pol-1",
    invoice_id: "inv-100",
    claimant_address: "GBCLAIMANT999",
    incident_date: "2026-11-15T00:00:00Z",
    incident_type: "default",
    incident_description: "Debtor failed to remit principal on scheduled maturity date.",
    claimed_amount: 20000,
    evidence: sampleEvidence,
    status: "submitted",
    created_at: "2026-11-16T10:00:00Z",
  };

  it("renders coverage reconciliation to face value and policy details", () => {
    render(
      <InsuranceCoveragePanel
        invoiceId="inv-100"
        walletAddress="GBINVESTOR..."
        policyOverride={samplePolicy}
        claimsOverride={[]}
      />
    );

    expect(screen.getByText(/Invoice Insurance Protection/i)).toBeInTheDocument();
    expect(screen.getByTestId("policy-status-badge")).toHaveTextContent("ACTIVE");
    expect(screen.getByTestId("protection-level-badge")).toHaveTextContent("Full Protection (100%)");

    // Reconciliation card
    expect(screen.getByTestId("reconciliation-face-value")).toHaveTextContent("50,000 XLM");
    expect(screen.getByTestId("reconciliation-coverage-limit")).toHaveTextContent("50,000 XLM");
    expect(screen.getByTestId("reconciliation-deductible")).toHaveTextContent("1,500 XLM");
  });

  it("validates and submits a new claim with signed evidence", async () => {
    render(
      <InsuranceCoveragePanel
        invoiceId="inv-100"
        walletAddress="GBINVESTOR..."
        policyOverride={samplePolicy}
        claimsOverride={[]}
      />
    );

    // Open claim form
    fireEvent.click(screen.getByTestId("open-claim-form-btn"));

    const submitBtn = screen.getByTestId("submit-claim-btn");
    expect(submitBtn).toBeDisabled();

    // Fill form fast with fireEvent
    fireEvent.change(screen.getByTestId("claim-date-input"), { target: { value: "2026-11-15" } });
    fireEvent.change(screen.getByTestId("claim-amount-input"), { target: { value: "15000" } });
    fireEvent.change(screen.getByTestId("claim-description-input"), {
      target: { value: "Debtor was placed into liquidation following insolvency notice." },
    });

    // Attach signed evidence
    fireEvent.change(screen.getByTestId("evidence-doc-name-input"), { target: { value: "insolvency_filing.pdf" } });
    fireEvent.click(screen.getByTestId("add-evidence-btn"));

    expect(screen.getByTestId("attached-evidence-list")).toBeInTheDocument();
    expect(submitBtn).toBeEnabled();

    fireEvent.click(submitBtn);
    expect(mockSubmitClaim).toHaveBeenCalledWith(
      expect.objectContaining({
        incident_type: "default",
        claimed_amount: 15000,
        incident_description: "Debtor was placed into liquidation following insolvency notice.",
      }),
      expect.anything()
    );
  });

  it("allows inspecting secure evidence document", () => {
    render(
      <InsuranceCoveragePanel
        invoiceId="inv-100"
        walletAddress="GBINVESTOR..."
        policyOverride={samplePolicy}
        claimsOverride={[sampleClaim]}
      />
    );

    const viewDocBtn = screen.getByTestId("view-evidence-btn-ev-1");
    expect(viewDocBtn).toBeInTheDocument();

    fireEvent.click(viewDocBtn);

    // Modal appears
    const modal = screen.getByTestId("secure-doc-modal");
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByText("debtor_default_notice.pdf")).toBeInTheDocument();
    expect(within(modal).getByText(/QmHash123456789sha256/i)).toBeInTheDocument();

    // Close modal
    fireEvent.click(screen.getByTestId("close-secure-doc-btn"));
    expect(screen.queryByTestId("secure-doc-modal")).not.toBeInTheDocument();
  });

  it("enforces role-authorization: only underwriter can adjudicate claims", () => {
    // 1. Regular investor logged in
    const { rerender } = render(
      <InsuranceCoveragePanel
        invoiceId="inv-100"
        walletAddress="GBINVESTOR..."
        policyOverride={samplePolicy}
        claimsOverride={[sampleClaim]}
      />
    );

    expect(screen.queryByTestId("adjudicate-actions-claim-1")).not.toBeInTheDocument();

    // 2. Underwriter logged in
    rerender(
      <InsuranceCoveragePanel
        invoiceId="inv-100"
        walletAddress="GBUNDERWRITER123"
        policyOverride={samplePolicy}
        claimsOverride={[sampleClaim]}
      />
    );

    expect(screen.getByTestId("adjudicate-actions-claim-1")).toBeInTheDocument();
    const approveBtn = screen.getByTestId("open-approve-btn-claim-1");
    const denyBtn = screen.getByTestId("open-deny-btn-claim-1");
    expect(approveBtn).toBeInTheDocument();
    expect(denyBtn).toBeInTheDocument();

    // Test approve action
    fireEvent.click(approveBtn);
    expect(screen.getByTestId("adjudicate-dialog-claim-1")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("confirm-adjudication-btn"));

    expect(mockAdjudicateClaim).toHaveBeenCalledWith(
      expect.objectContaining({
        claimId: "claim-1",
        decision: "approved",
      }),
      expect.anything()
    );
  });

  it("renders approved claim payout details and denied claim reasons", () => {
    const resolvedClaims: InsuranceClaim[] = [
      {
        ...sampleClaim,
        id: "claim-approved",
        status: "approved",
        payout_amount: 18500,
        adjudicated_by: "GBUNDERWRITER123",
      },
      {
        ...sampleClaim,
        id: "claim-denied",
        status: "denied",
        denial_reason: "Notice filed beyond policy notification deadline.",
        adjudicated_by: "GBUNDERWRITER123",
      },
    ];

    render(
      <InsuranceCoveragePanel
        invoiceId="inv-100"
        walletAddress="GBINVESTOR..."
        policyOverride={samplePolicy}
        claimsOverride={resolvedClaims}
      />
    );

    expect(screen.getByTestId("approved-details-claim-approved")).toHaveTextContent(
      "18,500 XLM"
    );
    expect(screen.getByTestId("denied-details-claim-denied")).toHaveTextContent(
      "Denied: Notice filed beyond policy notification deadline."
    );
  });
});
