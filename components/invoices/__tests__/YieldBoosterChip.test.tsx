import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { YieldBoosterChip } from "../YieldBoosterChip";
import { PortfolioYieldBoostBadge } from "@/components/dashboard/PortfolioYieldBoostBadge";
import type { InvoiceYieldBoost } from "@/lib/api";

const mockBoost = vi.fn();
const mockWallet = vi.fn();

vi.mock("@/hooks/useInvoiceYieldBoost", () => ({
  useInvoiceYieldBoost: () => mockBoost(),
}));

vi.mock("@/context/WalletContext", () => ({
  useWallet: () => mockWallet(),
}));

function boost(overrides: Partial<InvoiceYieldBoost> = {}): InvoiceYieldBoost {
  return {
    eligible: true,
    tier: "silver",
    base_yield: 8,
    boosted_yield: 8.5,
    ...overrides,
  };
}

describe("YieldBoosterChip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWallet.mockReturnValue({ address: "GINV" });
    mockBoost.mockReturnValue({ data: boost() });
  });

  it("shows the base yield, the tier and the boosted yield", () => {
    render(<YieldBoosterChip invoiceId="inv-1" />);
    expect(screen.getByTestId("yield-booster-chip")).toBeInTheDocument();
    expect(screen.getByTestId("yield-boost-base")).toHaveTextContent("8%");
    expect(screen.getByTestId("yield-boost-boosted")).toHaveTextContent("8.5%");
    expect(screen.getByTestId("yield-boost-tier")).toHaveTextContent("Silver");
  });

  it("labels gold and platinum tiers correctly", () => {
    mockBoost.mockReturnValue({ data: boost({ tier: "gold", boosted_yield: 9 }) });
    const { unmount } = render(<YieldBoosterChip invoiceId="inv-1" />);
    expect(screen.getByTestId("yield-boost-tier")).toHaveTextContent("Gold");
    unmount();

    mockBoost.mockReturnValue({ data: boost({ tier: "platinum", boosted_yield: 10 }) });
    render(<YieldBoosterChip invoiceId="inv-1" />);
    expect(screen.getByTestId("yield-boost-tier")).toHaveTextContent("Platinum");
  });

  it("renders nothing for a bronze wallet", () => {
    mockBoost.mockReturnValue({ data: boost({ tier: "bronze" }) });
    render(<YieldBoosterChip invoiceId="inv-1" />);
    expect(screen.queryByTestId("yield-booster-chip")).toBeNull();
  });

  it("renders nothing for an ineligible wallet", () => {
    mockBoost.mockReturnValue({ data: boost({ eligible: false }) });
    render(<YieldBoosterChip invoiceId="inv-1" />);
    expect(screen.queryByTestId("yield-booster-chip")).toBeNull();
  });

  it("renders nothing for an unregistered wallet with no boost record", () => {
    mockBoost.mockReturnValue({ data: undefined });
    render(<YieldBoosterChip invoiceId="inv-1" />);
    expect(screen.queryByTestId("yield-booster-chip")).toBeNull();
  });

  it("reflects a tier change", () => {
    mockBoost.mockReturnValue({
      data: boost({ tier: "platinum", base_yield: 8, boosted_yield: 9.5 }),
    });
    render(<YieldBoosterChip invoiceId="inv-1" />);
    expect(screen.getByTestId("yield-boost-tier")).toHaveTextContent("Platinum");
    expect(screen.getByTestId("yield-boost-boosted")).toHaveTextContent("9.5%");
  });
});

describe("PortfolioYieldBoostBadge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWallet.mockReturnValue({ address: "GINV" });
    mockBoost.mockReturnValue({ data: boost({ tier: "gold", boosted_yield: 9 }) });
  });

  it("shows a boosted-yield badge for an eligible holding", () => {
    render(<PortfolioYieldBoostBadge invoiceId="inv-7" />);
    expect(screen.getByTestId("yield-boost-badge-inv-7")).toHaveTextContent("Gold");
    expect(screen.getByTestId("yield-boost-badge-inv-7")).toHaveTextContent("9%");
  });

  it("renders no badge when the wallet has no boost", () => {
    mockBoost.mockReturnValue({ data: boost({ tier: "bronze" }) });
    render(<PortfolioYieldBoostBadge invoiceId="inv-7" />);
    expect(screen.queryByTestId("yield-boost-badge-inv-7")).toBeNull();
  });
});
