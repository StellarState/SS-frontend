import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { FundWalletGuide } from "../FundWalletGuide";

const mockRefresh = vi.fn();
let mockBalances: {
  xlm: number;
  asset: number;
  hasTrustline: boolean;
  reserveXlm: number;
} | null = null;

vi.mock("@/context/WalletContext", () => ({
  useWallet: () => ({
    address: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    isConnected: true,
    wallet: "freighter",
    connect: vi.fn(),
  }),
}));

vi.mock("@/hooks/useWalletBalances", () => ({
  useWalletBalances: () => ({ balances: mockBalances, isLoading: false, refresh: mockRefresh }),
}));

vi.mock("../TopUpDialog", () => ({ TopUpDialog: () => <div data-testid="top-up-dialog" /> }));

vi.mock("../TrustlineStep", () => ({
  TrustlineStep: ({ hasTrustline }: { hasTrustline: boolean }) => (
    <div data-testid="trustline-step" data-has-trustline={hasTrustline} />
  ),
}));

describe("FundWalletGuide", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBalances = { xlm: 0, asset: 0, hasTrustline: false, reserveXlm: 1 };
  });

  it("shows incomplete steps for an unfunded wallet and a 1 XLM reserve", () => {
    render(<FundWalletGuide />);
    expect(screen.getByTestId("step-xlm")).toHaveAttribute("data-complete", "false");
    expect(screen.getByTestId("step-trustline")).toHaveAttribute("data-complete", "false");
    expect(screen.getByTestId("step-asset")).toHaveAttribute("data-complete", "false");
    expect(screen.getByTestId("reserve-notice")).toHaveTextContent("1 XLM");
    expect(screen.queryByText("Complete")).not.toBeInTheDocument();
  });

  it("marks funding steps complete and raises the reserve once the trustline exists", () => {
    mockBalances = { xlm: 5, asset: 250, hasTrustline: true, reserveXlm: 1 };
    render(<FundWalletGuide />);
    expect(screen.getByTestId("step-xlm")).toHaveAttribute("data-complete", "true");
    expect(screen.getByTestId("step-trustline")).toHaveAttribute("data-complete", "true");
    expect(screen.getByTestId("step-asset")).toHaveAttribute("data-complete", "true");
    expect(screen.getByTestId("reserve-notice")).toHaveTextContent("2 XLM");
    expect(screen.getAllByText("Complete")).toHaveLength(3);
  });

  it("shows a trustline-only wallet as needing XLM and the asset", () => {
    mockBalances = { xlm: 0.4, asset: 0, hasTrustline: true, reserveXlm: 1 };
    render(<FundWalletGuide />);
    expect(screen.getByTestId("step-xlm")).toHaveAttribute("data-complete", "false");
    expect(screen.getByTestId("step-trustline")).toHaveAttribute("data-complete", "true");
    expect(screen.getByTestId("trustline-step")).toHaveAttribute("data-has-trustline", "true");
  });

  it("lists on-ramp providers with their supported regions", () => {
    render(<FundWalletGuide />);
    expect(screen.getByTestId("on-ramps")).toHaveTextContent("Coinbase");
    expect(screen.getByTestId("on-ramps")).toHaveTextContent("Worldwide");
  });
});
