import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CollateralHealthPanel } from "../CollateralHealthPanel";
import type { CollateralPosition, CollateralActionHistory } from "@/lib/analytics/collateralHealth";

const mockTopUp = vi.fn();
const mockWithdraw = vi.fn();

vi.mock("@/hooks/useCollateralHealth", () => ({
  useCollateralPosition: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
  })),
  useCollateralHistory: vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
  })),
  useTopUpCollateralMutation: vi.fn(() => ({
    mutate: mockTopUp,
    isPending: false,
  })),
  useWithdrawCollateralMutation: vi.fn(() => ({
    mutate: mockWithdraw,
    isPending: false,
  })),
}));

describe("CollateralHealthPanel (#683)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const healthyPosition: CollateralPosition = {
    id: "pos-10",
    invoice_id: "inv-700",
    borrower_address: "GBBORROWER...",
    outstanding_debt_xlm: 50000,
    current_collateral_xlm: 75000,
    collateral_asset: "XLM",
    valuation_model: "mark_to_market",
    haircut_percent: 15.0,
    effective_collateral_value: 75000,
    required_collateral_value: 60000,
    buffer_amount_xlm: 15000,
    current_health_ratio_percent: 150.0,
    health_status: "healthy",
  };

  const criticalPosition: CollateralPosition = {
    ...healthyPosition,
    current_collateral_xlm: 52000,
    effective_collateral_value: 52000,
    buffer_amount_xlm: -8000,
    current_health_ratio_percent: 104.0,
    health_status: "critical",
  };

  const sampleHistory: CollateralActionHistory[] = [
    {
      id: "act-1",
      position_id: "pos-10",
      type: "top_up",
      amount_xlm: 15000,
      source_or_destination: "Connected Stellar Wallet",
      previous_ratio_percent: 120.0,
      resulting_ratio_percent: 150.0,
      timestamp: "2026-11-20T10:00:00Z",
      tx_hash: "tx_mock_hash",
    },
  ];

  it("renders metrics grid, requirement and buffer amount", () => {
    render(
      <CollateralHealthPanel
        invoiceId="inv-700"
        walletAddress="GBBORROWER..."
        positionOverride={healthyPosition}
        historyOverride={sampleHistory}
      />
    );

    expect(screen.getByText(/Collateral Health & Top-Up/i)).toBeInTheDocument();
    expect(screen.getByTestId("health-status-badge")).toHaveTextContent("HEALTHY (150%)");
    expect(screen.getByTestId("metric-outstanding-debt")).toHaveTextContent("50,000 XLM");
    expect(screen.getByTestId("metric-deposited-collateral")).toHaveTextContent("75,000 XLM");
    expect(screen.getByTestId("metric-required-collateral")).toHaveTextContent("60,000 XLM");
    expect(screen.getByTestId("metric-buffer-amount")).toHaveTextContent("+15,000 XLM");
  });

  it("prominently renders critical liquidation warning when health ratio is critical", () => {
    render(
      <CollateralHealthPanel
        invoiceId="inv-700"
        walletAddress="GBBORROWER..."
        positionOverride={criticalPosition}
        historyOverride={[]}
      />
    );

    expect(screen.getByTestId("critical-state-banner")).toBeInTheDocument();
    expect(screen.getByText(/CRITICAL COLLATERAL LEVEL: LIQUIDATION IMMINENT/i)).toBeInTheDocument();
  });

  it("previews top-up and executes top-up mutation", () => {
    render(
      <CollateralHealthPanel
        invoiceId="inv-700"
        walletAddress="GBBORROWER..."
        positionOverride={criticalPosition}
        historyOverride={[]}
      />
    );

    const amountInput = screen.getByTestId("action-amount-input");
    fireEvent.change(amountInput, { target: { value: "20000" } });

    // Preview appears
    expect(screen.getByTestId("collateral-action-preview")).toBeInTheDocument();
    expect(screen.getByTestId("preview-resulting-collateral")).toHaveTextContent("72,000 XLM");
    expect(screen.getByTestId("preview-resulting-ratio")).toHaveTextContent("144%");
    expect(screen.getByTestId("preview-resulting-status")).toHaveTextContent("HEALTHY");

    const submitBtn = screen.getByTestId("submit-action-btn");
    expect(submitBtn).toBeEnabled();

    fireEvent.click(submitBtn);
    expect(mockTopUp).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 20000,
        sourceAddress: "Connected Stellar Wallet",
      }),
      expect.anything()
    );
  });

  it("blocks withdrawals that breach the 120% minimum collateral requirement", () => {
    render(
      <CollateralHealthPanel
        invoiceId="inv-700"
        walletAddress="GBBORROWER..."
        positionOverride={healthyPosition} // 75k collateral on 50k debt (150%)
        historyOverride={[]}
      />
    );

    // Switch to withdrawal tab
    fireEvent.click(screen.getByTestId("tab-withdrawal"));

    // Attempt to withdraw 25,000 XLM -> resulting 50,000 (100% < 120%)
    const amountInput = screen.getByTestId("action-amount-input");
    fireEvent.change(amountInput, { target: { value: "25000" } });

    expect(screen.getByTestId("collateral-action-preview")).toBeInTheDocument();
    expect(screen.getByTestId("preview-block-error")).toHaveTextContent(
      "Withdrawal blocked: Resulting ratio (100%) falls below 120.00% minimum collateral requirement."
    );

    const submitBtn = screen.getByTestId("submit-action-btn");
    expect(submitBtn).toBeDisabled();
  });

  it("allows safe excess withdrawal within collateral buffer", () => {
    render(
      <CollateralHealthPanel
        invoiceId="inv-700"
        walletAddress="GBBORROWER..."
        positionOverride={healthyPosition} // 75k collateral on 50k debt (150%)
        historyOverride={[]}
      />
    );

    // Switch to withdrawal tab
    fireEvent.click(screen.getByTestId("tab-withdrawal"));

    // Safe withdrawal of 10,000 XLM -> resulting 65,000 (130% >= 120%)
    const amountInput = screen.getByTestId("action-amount-input");
    fireEvent.change(amountInput, { target: { value: "10000" } });

    expect(screen.queryByTestId("preview-block-error")).not.toBeInTheDocument();
    const submitBtn = screen.getByTestId("submit-action-btn");
    expect(submitBtn).toBeEnabled();

    fireEvent.click(submitBtn);
    expect(mockWithdraw).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 10000,
        destinationAddress: "GBBORROWER...",
      }),
      expect.anything()
    );
  });

  it("renders collateral modification history items", () => {
    render(
      <CollateralHealthPanel
        invoiceId="inv-700"
        walletAddress="GBBORROWER..."
        positionOverride={healthyPosition}
        historyOverride={sampleHistory}
      />
    );

    expect(screen.getByTestId("history-item-act-1")).toBeInTheDocument();
    expect(screen.getByTestId("history-item-act-1")).toHaveTextContent(
      "Top-Up: +15,000 XLM"
    );
    expect(screen.getByTestId("history-item-act-1")).toHaveTextContent(
      "Ratio: 120% → 150%"
    );
  });
});
