import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LegalTermsPanel } from "../LegalTermsPanel";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

describe("LegalTermsPanel (#679)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders versioned terms, jurisdiction, and plain-language clause summaries", () => {
    render(<LegalTermsPanel />);

    expect(screen.getByTestId("legal-terms-panel")).toBeInTheDocument();
    expect(screen.getByTestId("terms-version-badge")).toHaveTextContent("Version: v1.0.0");
    expect(screen.getByText(/Delaware Uniform Commercial Code/)).toBeInTheDocument();
    expect(screen.getByText("Assignment of Receivables")).toBeInTheDocument();
    expect(screen.getByText("Settlement and Waterfall Distribution")).toBeInTheDocument();
  });

  it("expands and collapses the full governing legal text for a clause", () => {
    render(<LegalTermsPanel />);

    const toggleBtn = screen.getByTestId("toggle-clause-btn-clause-assignment");
    expect(toggleBtn).toHaveTextContent("View Governing Text");

    // Click to view governing text
    fireEvent.click(toggleBtn);
    expect(screen.getByTestId("governing-text-clause-assignment")).toBeInTheDocument();
    expect(screen.getByTestId("governing-text-clause-assignment")).toHaveTextContent("irrevocably assigns, transfers, and conveys");

    // Click to hide
    fireEvent.click(toggleBtn);
    expect(screen.queryByTestId("governing-text-clause-assignment")).not.toBeInTheDocument();
  });

  it("strictly disables investment submission until terms are explicitly accepted", () => {
    const mockSubmit = vi.fn();
    render(<LegalTermsPanel onInvestmentSubmit={mockSubmit} />);

    const submitBtn = screen.getByTestId("btn-submit-investment");
    expect(submitBtn).toBeDisabled();

    // Clicking does nothing while disabled
    fireEvent.click(submitBtn);
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it("enables investment submission after checking the agreement and recording acceptance", () => {
    const mockSubmit = vi.fn();
    render(<LegalTermsPanel onInvestmentSubmit={mockSubmit} />);

    // Check agreement
    const checkbox = screen.getByTestId("terms-agreement-checkbox");
    fireEvent.click(checkbox);

    // Record acceptance
    const acceptBtn = screen.getByTestId("btn-record-acceptance");
    expect(acceptBtn).not.toBeDisabled();
    fireEvent.click(acceptBtn);

    // Submission should now be enabled
    const submitBtn = screen.getByTestId("btn-submit-investment");
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);
    expect(mockSubmit).toHaveBeenCalledTimes(1);

    // Acceptance badge is visible
    expect(screen.getByTestId("acceptance-confirmed-badge")).toHaveTextContent("Terms Accepted for Version v1.0.0");
  });

  it("invalidates acceptance and blocks submission when terms version updates (interrupted flow)", () => {
    const mockSubmit = vi.fn();
    render(<LegalTermsPanel onInvestmentSubmit={mockSubmit} />);

    // 1. Accept v1.0.0
    fireEvent.click(screen.getByTestId("terms-agreement-checkbox"));
    fireEvent.click(screen.getByTestId("btn-record-acceptance"));
    expect(screen.getByTestId("btn-submit-investment")).not.toBeDisabled();

    // 2. Upstream version update occurs (simulated via button)
    fireEvent.click(screen.getByTestId("btn-simulate-version-bump"));

    // 3. Acceptance is invalidated, warning appears, submission is blocked
    expect(screen.getByTestId("terms-version-badge")).toHaveTextContent("Version: v2.0.0");
    expect(screen.getByTestId("version-mismatch-warning")).toBeInTheDocument();
    expect(screen.getByTestId("version-mismatch-warning")).toHaveTextContent("Governing terms have been updated from v1.0.0 to v2.0.0");
    expect(screen.getByTestId("btn-submit-investment")).toBeDisabled();

    // 4. User reviews and re-accepts v2.0.0
    fireEvent.click(screen.getByTestId("terms-agreement-checkbox"));
    fireEvent.click(screen.getByTestId("btn-record-acceptance"));

    expect(screen.getByTestId("acceptance-confirmed-badge")).toHaveTextContent("Terms Accepted for Version v2.0.0");
    expect(screen.getByTestId("btn-submit-investment")).not.toBeDisabled();

    // 5. History records both accepted versions
    expect(screen.getByTestId("history-entry-v1.0.0")).toBeInTheDocument();
    expect(screen.getByTestId("history-entry-v2.0.0")).toBeInTheDocument();
  });
});
