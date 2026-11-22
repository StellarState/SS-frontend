import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { LoyaltyTierPanel } from "@/components/loyalty/LoyaltyTierPanel";

describe("LoyaltyTierPanel Component (Issue #691)", () => {
  it("renders with current tier badge and benefits", () => {
    render(<LoyaltyTierPanel />);
    expect(screen.getByTestId("loyalty-tier-panel")).toBeDefined();
    expect(screen.getByTestId("current-tier-badge")).toBeDefined();
    expect(screen.getByText("Active Tier Benefits")).toBeDefined();
  });

  it("displays progress to next tier", () => {
    render(<LoyaltyTierPanel />);
    expect(screen.getByTestId("tier-progress-card")).toBeDefined();
    expect(screen.getByText(/Progress to Gold Partner/i)).toBeDefined();
  });

  it("displays reconciled reward balance", () => {
    render(<LoyaltyTierPanel />);
    const bal = screen.getByTestId("available-reward-balance");
    expect(bal).toBeDefined();
    // Default initial ledger has 45.2 + 18.5 = 63.70 XLM
    expect(bal.textContent).toContain("63.70 XLM");
  });

  it("handles reward redemption and updates balance", () => {
    render(<LoyaltyTierPanel />);
    const input = screen.getByPlaceholderText(/Amount XLM/i);
    const redeemBtn = screen.getByTestId("redeem-reward-btn");

    fireEvent.change(input, { target: { value: "20" } });
    fireEvent.click(redeemBtn);

    expect(screen.getByTestId("redeem-success")).toBeDefined();
    const bal = screen.getByTestId("available-reward-balance");
    expect(bal.textContent).toContain("43.70 XLM");
  });

  it("prevents overdrawn redemption requests", () => {
    render(<LoyaltyTierPanel />);
    const input = screen.getByPlaceholderText(/Amount XLM/i);
    const redeemBtn = screen.getByTestId("redeem-reward-btn");

    fireEvent.change(input, { target: { value: "1000" } });
    fireEvent.click(redeemBtn);

    expect(screen.getByTestId("redeem-error")).toBeDefined();
    expect(screen.getByText(/Insufficient reward balance/i)).toBeDefined();
  });
});
