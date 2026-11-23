import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SettlementClaimQueue } from "../SettlementClaimQueue";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("SettlementClaimQueue (#682)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the claim queue panel and lists eligible settlement items", () => {
    renderWithClient(<SettlementClaimQueue />);

    expect(screen.getByTestId("settlement-claim-queue-panel")).toBeInTheDocument();
    expect(screen.getByText("SolarGrid Equipment Receivable")).toBeInTheDocument();
    expect(screen.getByText("Apex Logistics Net 60")).toBeInTheDocument();
    expect(screen.getByText("BioHealth Pharma Batch B")).toBeInTheDocument();
  });

  it("calculates and displays protocol fees, network fees, and net payouts for each item", () => {
    renderWithClient(<SettlementClaimQueue />);

    // Item 1: Gross 1500 -> 0.25% fee = 3.7500 -> Net = 1496.24
    const item1 = screen.getByTestId("claim-item-inv-claim-001");
    expect(item1).toHaveTextContent("1500.00 XLM");
    expect(item1).toHaveTextContent("3.7500 XLM");
    expect(item1).toHaveTextContent("1496.24 XLM");
  });

  it("allows selecting multiple claims and verifies reconciled bulk totals", () => {
    renderWithClient(<SettlementClaimQueue />);

    // Click select all
    fireEvent.click(screen.getByTestId("select-all-btn"));

    expect(screen.getByTestId("selected-count-label")).toHaveTextContent("3 of 3 selected");
    expect(screen.getByTestId("bulk-reconciliation-summary")).toBeInTheDocument();
    expect(screen.getByTestId("reconciliation-verified-badge")).toHaveTextContent("✓ Reconciled");
    expect(screen.getByTestId("execute-bulk-claim-btn")).toBeInTheDocument();
  });

  it("toggles delegated operator mode and verifies operator scope banner", () => {
    renderWithClient(
      <SettlementClaimQueue
        investorAddress="GBINVESTOR_DEMO_ADDRESS"
        defaultOperatorAddress="GBOPERATOR_AUTHORIZED_01"
      />,
    );

    const operatorSwitch = screen.getByTestId("operator-mode-switch");
    fireEvent.click(operatorSwitch);

    expect(screen.getByTestId("operator-status-banner")).toBeInTheDocument();
    expect(screen.getByText(/Scope: claims:execute/)).toBeInTheDocument();
  });

  it("allows simulating a failure and provides an independent retry button", async () => {
    renderWithClient(<SettlementClaimQueue />);

    // Simulate failure on first item
    const failBtn = screen.getByTestId("simulate-fail-btn-inv-claim-001");
    fireEvent.click(failBtn);

    // Should transition to failed state with retry button
    await waitFor(() => {
      expect(screen.getByTestId("failed-badge-inv-claim-001")).toBeInTheDocument();
      expect(screen.getByTestId("retry-btn-inv-claim-001")).toBeInTheDocument();
    });

    // Click retry
    fireEvent.click(screen.getByTestId("retry-btn-inv-claim-001"));

    // Should succeed and show settled
    await waitFor(() => {
      expect(screen.getByTestId("claim-item-inv-claim-001")).toHaveTextContent("Settled");
    });
  });

  it("logs claim events to the audit tab with status and net payout details", async () => {
    renderWithClient(<SettlementClaimQueue />);

    // Claim second item
    fireEvent.click(screen.getByTestId("claim-single-btn-inv-claim-002"));

    // Switch to audit tab
    fireEvent.click(screen.getByTestId("tab-audit"));

    await waitFor(() => {
      expect(screen.getByTestId("audit-log-section")).toBeInTheDocument();
      expect(screen.getByText("Apex Logistics Net 60")).toBeInTheDocument();
      expect(screen.getByText("SUCCESS")).toBeInTheDocument();
    });
  });
});
