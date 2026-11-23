import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { UnderwritingPositionsTab } from "../UnderwritingPositionsTab";

const mockPositions = vi.fn();
vi.mock("@/hooks/useUnderwriting", () => ({
  useUnderwritingPositions: () => mockPositions(),
}));
vi.mock("@/context/WalletContext", () => ({
  useWallet: () => ({ address: "GUNDERWRITER" }),
}));

describe("UnderwritingPositionsTab (#587)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists positions with their status", () => {
    mockPositions.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        { invoice_id: "a", invoice_title: "Alpha", staked: 1000, premium_rate: 4, premium_earned: 0, loss_absorbed: 0, status: "active" },
        { invoice_id: "b", invoice_title: "Beta", staked: 500, premium_rate: 5, premium_earned: 25, loss_absorbed: 0, status: "claimable" },
        { invoice_id: "c", invoice_title: "Gamma", staked: 800, premium_rate: 6, premium_earned: 48, loss_absorbed: 0, status: "released" },
        { invoice_id: "d", invoice_title: "Delta", staked: 900, premium_rate: 6, premium_earned: 0, loss_absorbed: 400, status: "absorbed" },
      ],
    });
    render(<UnderwritingPositionsTab />);
    expect(screen.getByTestId("underwriting-row-a")).toHaveTextContent("Alpha");
    expect(screen.getByTestId("underwriting-status-a")).toHaveTextContent("Active");
    expect(screen.getByTestId("underwriting-status-b")).toHaveTextContent("Settled — release available");
    expect(screen.getByTestId("underwriting-status-c")).toHaveTextContent("Released");
    expect(screen.getByTestId("underwriting-status-d")).toHaveTextContent("Loss absorbed");
    expect(screen.getByTestId("underwriting-row-d")).toHaveTextContent("400 XLM");
  });

  it("shows an empty state", () => {
    mockPositions.mockReturnValue({ isLoading: false, isError: false, data: [] });
    render(<UnderwritingPositionsTab />);
    expect(screen.getByTestId("underwriting-empty")).toBeInTheDocument();
  });
});
