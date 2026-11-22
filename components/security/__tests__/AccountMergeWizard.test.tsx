import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AccountMergeWizard } from "../AccountMergeWizard";
import {
  SAMPLE_PRIMARY_ACCOUNT,
  SAMPLE_COMPATIBLE_SECONDARY,
  SAMPLE_CONFLICTING_SECONDARY,
} from "@/lib/security/accountMerge";

describe("AccountMergeWizard Component (#675)", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") {
      window.URL.createObjectURL = vi.fn(() => "blob:receipt-mock-url");
      window.URL.revokeObjectURL = vi.fn();
    }
  });

  it("navigates through wizard steps and previews all affected holdings and data", () => {
    render(<AccountMergeWizard />);

    // Step 1: Identifies primary and merging wallets
    expect(screen.getByTestId("wizard-step-1")).toBeInTheDocument();
    expect(screen.getByText("Alpha Capital (Primary)")).toBeInTheDocument();
    expect(screen.getByText("Alpha Ops Secondary")).toBeInTheDocument();

    // Advance to Step 2
    fireEvent.click(screen.getByTestId("btn-step-1-next"));

    // Step 2: Lists all affected data properties
    expect(screen.getByTestId("wizard-step-2")).toBeInTheDocument();
    expect(screen.getByTestId("row-usdc-balance")).toHaveTextContent("$2,850,000");
    expect(screen.getByTestId("row-xlm-balance")).toHaveTextContent("57,000 XLM");
    expect(screen.getByTestId("row-active-invoices")).toHaveTextContent("15 total");
    expect(screen.getByTestId("row-stale-sessions")).toHaveTextContent("2 Revoked");
  });

  it("blocks progression when KYC identity conflict is detected", () => {
    render(
      <AccountMergeWizard
        initialOptions={{
          initialPrimary: SAMPLE_PRIMARY_ACCOUNT,
          initialSecondary: SAMPLE_CONFLICTING_SECONDARY,
        }}
      />
    );

    // Advance to Step 2
    fireEvent.click(screen.getByTestId("btn-step-1-next"));

    // KYC conflict alert shown
    expect(screen.getByTestId("alert-kyc-conflict")).toBeInTheDocument();
    expect(screen.getByText(/Merge Strictly Blocked: KYC Identity Conflict/i)).toBeInTheDocument();

    // Next step button is disabled
    const nextBtn = screen.getByTestId("btn-step-2-next");
    expect(nextBtn).toBeDisabled();
  });

  it("enforces dual cryptographic proofs from both wallets before permitting merge", async () => {
    render(<AccountMergeWizard />);

    // Advance Step 1 -> 2 -> 3
    fireEvent.click(screen.getByTestId("btn-step-1-next"));
    fireEvent.click(screen.getByTestId("btn-step-2-next"));

    // Step 3
    expect(screen.getByTestId("wizard-step-3")).toBeInTheDocument();
    expect(screen.getByTestId("merge-challenge-box")).toHaveTextContent("StellarSettle Authorization");

    // Execute button disabled before signatures
    const executeBtn = screen.getByTestId("btn-execute-merge");
    expect(executeBtn).toBeDisabled();

    // Sign primary wallet
    fireEvent.click(screen.getByTestId("btn-sign-primary"));
    expect(screen.getByTestId("badge-primary-verified")).toBeInTheDocument();
    expect(executeBtn).toBeDisabled();

    // Sign secondary wallet
    fireEvent.click(screen.getByTestId("btn-sign-secondary"));
    expect(screen.getByTestId("badge-secondary-verified")).toBeInTheDocument();

    // Now execute button is enabled
    expect(executeBtn).not.toBeDisabled();
  });

  it("completes merge, revokes stale sessions and displays audit receipt", async () => {
    render(<AccountMergeWizard />);

    // Step 1 -> 2 -> 3
    fireEvent.click(screen.getByTestId("btn-step-1-next"));
    fireEvent.click(screen.getByTestId("btn-step-2-next"));

    // Sign both
    fireEvent.click(screen.getByTestId("btn-sign-primary"));
    fireEvent.click(screen.getByTestId("btn-sign-secondary"));

    // Execute merge
    fireEvent.click(screen.getByTestId("btn-execute-merge"));

    // Step 4: Audit Receipt
    expect(screen.getByTestId("wizard-step-4")).toBeInTheDocument();
    expect(screen.getByTestId("revoked-sessions-box")).toHaveTextContent(
      "Stale Sessions Revoked (2 sessions destroyed)"
    );
    expect(screen.getByText("sess-sec-chrome-981")).toBeInTheDocument();
    expect(screen.getByText("sess-sec-tablet-402")).toBeInTheDocument();

    // Check audit hash and consolidated balances
    expect(screen.getByTestId("receipt-merge-id")).toBeInTheDocument();
    expect(screen.getByTestId("receipt-audit-hash")).toHaveTextContent("0x");
    expect(screen.getByTestId("receipt-consolidated-usdc")).toHaveTextContent("$2,850,000 USDC");

    // Download audit receipt JSON
    const downloadBtn = screen.getByTestId("btn-download-receipt");
    fireEvent.click(downloadBtn);
    expect(window.URL.createObjectURL).toHaveBeenCalled();
  });
});
