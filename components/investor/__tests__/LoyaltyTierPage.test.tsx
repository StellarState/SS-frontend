import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LoyaltyTierPage } from "../LoyaltyTierPage";
import type { InvestorLoyalty } from "@/lib/api";

const mockLoyalty = vi.fn();

vi.mock("@/hooks/useInvestorLoyalty", () => ({
  useInvestorLoyalty: () => mockLoyalty(),
}));

vi.mock("@/context/WalletContext", () => ({
  useWallet: () => ({ address: "GINV", isConnected: true }),
}));

vi.mock("@/hooks/usePageTitle", () => ({ usePageTitle: () => {} }));

const tiers: InvestorLoyalty["tiers"] = [
  { tier: "bronze", threshold: 0, fee_discount: 0, yield_boost: 0 },
  { tier: "silver", threshold: 10000, fee_discount: 5, yield_boost: 0.25 },
  { tier: "gold", threshold: 50000, fee_discount: 10, yield_boost: 0.5 },
  { tier: "platinum", threshold: 200000, fee_discount: 20, yield_boost: 1 },
];

function loyalty(overrides: Partial<InvestorLoyalty> = {}) {
  mockLoyalty.mockReturnValue({
    data: { tier: "silver", cumulative_volume: 30000, tiers, promoted_at: null, ...overrides },
    isLoading: false,
    isError: false,
  });
}

describe("LoyaltyTierPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the current tier and cumulative volume", () => {
    loyalty();
    render(<LoyaltyTierPage />);
    expect(screen.getByTestId("current-tier-name")).toHaveTextContent("Silver");
    expect(screen.getByTestId("cumulative-volume")).toHaveTextContent("30,000 XLM");
  });

  it("shows progress toward the next tier threshold", () => {
    loyalty();
    render(<LoyaltyTierPage />);
    expect(screen.getByTestId("tier-progress-percent")).toHaveTextContent("50%");
    expect(screen.getByTestId("tier-remaining")).toHaveTextContent(
      "20,000 XLM more to reach Gold",
    );
  });

  it("renders a benefits row for all four tiers", () => {
    loyalty();
    render(<LoyaltyTierPage />);
    for (const tier of ["bronze", "silver", "gold", "platinum"]) {
      expect(screen.getByTestId(`tier-row-${tier}`)).toBeInTheDocument();
    }
    expect(screen.getByTestId("tier-row-gold")).toHaveTextContent("10%");
  });

  it("shows the upgrade banner within 48h of promotion", () => {
    loyalty({ promoted_at: new Date(Date.now() - 60 * 60 * 1000).toISOString() });
    render(<LoyaltyTierPage />);
    expect(screen.getByTestId("tier-upgrade-banner")).toBeInTheDocument();
  });

  it("hides the upgrade banner after 48h", () => {
    loyalty({ promoted_at: new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString() });
    render(<LoyaltyTierPage />);
    expect(screen.queryByTestId("tier-upgrade-banner")).toBeNull();
  });

  it("shows Max Tier Reached at platinum", () => {
    loyalty({ tier: "platinum", cumulative_volume: 250000 });
    render(<LoyaltyTierPage />);
    expect(screen.getByTestId("max-tier-reached")).toHaveTextContent("Max Tier Reached");
    expect(screen.queryByTestId("tier-progress-bar")).toBeNull();
  });

  it("shows dated threshold and verified server snapshot evaluation badge", () => {
    loyalty();
    render(<LoyaltyTierPage />);
    expect(screen.getByTestId("dated-threshold")).toBeInTheDocument();
    expect(screen.getByTestId("server-snapshot-badge")).toHaveTextContent(/Server Snapshot:/i);
  });

  it("renders rewards ledger with reconciled balance and allows redemption", () => {
    loyalty();
    render(<LoyaltyTierPage />);
    expect(screen.getByTestId("rewards-ledger-card")).toBeInTheDocument();
    expect(screen.getByTestId("ledger-balance")).toHaveTextContent("100 XLM"); // 150 + 50 - 100

    const input = screen.getByTestId("redeem-amount-input");
    const submitBtn = screen.getByTestId("redeem-submit-btn");

    fireEvent.change(input, { target: { value: "50" } });
    fireEvent.click(submitBtn);

    expect(screen.getByTestId("redemption-success")).toHaveTextContent("Successfully redeemed 50 XLM");
    expect(screen.getByTestId("ledger-balance")).toHaveTextContent("50 XLM");
  });
});
