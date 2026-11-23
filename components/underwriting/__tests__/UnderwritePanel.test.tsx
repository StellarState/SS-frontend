import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { UnderwritePanel } from "../UnderwritePanel";
import type { InvoiceCover } from "@/lib/api";

const mockCover = vi.fn();
const mockStake = vi.fn();
const mockRelease = vi.fn();

vi.mock("@/hooks/useUnderwriting", () => ({
  useInvoiceCover: () => mockCover(),
  useStakeCoverMutation: () => ({ mutate: mockStake, isPending: false }),
  useReleaseStakeMutation: () => ({ mutate: mockRelease, isPending: false }),
}));

vi.mock("@/context/WalletContext", () => ({
  useWallet: () => ({ address: "GUNDERWRITER", isConnected: true }),
}));

function cover(overrides: Partial<InvoiceCover> = {}): InvoiceCover {
  return {
    invoice_id: "inv-1",
    staked: 2500,
    max_cover: 10000,
    remaining_capacity: 7500,
    premium_rate: 4,
    loss_absorbed: 0,
    user_stake: 0,
    user_released: false,
    ...overrides,
  };
}

function renderPanel(status: "open" | "funded" | "settled" | "defaulted", c: InvoiceCover) {
  mockCover.mockReturnValue({ data: c, isLoading: false, isError: false });
  return render(<UnderwritePanel invoiceId="inv-1" invoiceStatus={status} />);
}

describe("UnderwritePanel (#587)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders nothing when the invoice has no cover pool", () => {
    const { container } = renderPanel("open", cover({ max_cover: 0 }));
    expect(container).toBeEmptyDOMElement();
  });

  it("meter reflects staked cover relative to the cap", () => {
    renderPanel("open", cover());
    expect(screen.getByTestId("cover-meter-percent")).toHaveTextContent("25.0%");
    expect(screen.getByTestId("cover-meter-fill")).toHaveStyle({ width: "25%" });
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "2500");
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuemax", "10000");
    expect(screen.getByTestId("cover-meter-remaining")).toHaveTextContent("7,500 XLM capacity remaining");
  });

  it("updates the projected premium as the stake changes", () => {
    renderPanel("open", cover());
    const input = screen.getByTestId("underwrite-amount");
    expect(screen.getByTestId("underwrite-projected-premium")).toHaveTextContent("0 XLM");
    fireEvent.change(input, { target: { value: "1000" } });
    expect(screen.getByTestId("underwrite-projected-premium")).toHaveTextContent("40 XLM");
    fireEvent.change(input, { target: { value: "2500" } });
    expect(screen.getByTestId("underwrite-projected-premium")).toHaveTextContent("100 XLM");
    expect(screen.getByTestId("underwrite-rate")).toHaveValue("4%");
  });

  it("blocks a stake above remaining capacity with an inline message", () => {
    renderPanel("open", cover());
    fireEvent.change(screen.getByTestId("underwrite-amount"), { target: { value: "7501" } });
    expect(screen.getByTestId("underwrite-capacity-error")).toHaveTextContent(/remaining capacity of 7,500 XLM/);
    expect(screen.getByTestId("underwrite-submit")).toBeDisabled();
    fireEvent.submit(screen.getByTestId("underwrite-form"));
    expect(mockStake).not.toHaveBeenCalled();
  });

  it("submits a stake exactly at the remaining capacity", () => {
    renderPanel("open", cover());
    fireEvent.change(screen.getByTestId("underwrite-amount"), { target: { value: "7500" } });
    expect(screen.queryByTestId("underwrite-capacity-error")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("underwrite-submit"));
    expect(mockStake).toHaveBeenCalledWith(
      { wallet: "GUNDERWRITER", amount: 7500 },
      expect.any(Object),
    );
  });

  it("disables staking input when the invoice is fully covered", () => {
    renderPanel("open", cover({ staked: 10000, remaining_capacity: 0 }));
    expect(screen.getByTestId("underwrite-amount")).toBeDisabled();
    expect(screen.getByTestId("cover-meter-remaining")).toHaveTextContent("Fully covered");
  });

  it("keeps Release disabled until the invoice is settled", () => {
    renderPanel("funded", cover({ user_stake: 500 }));
    expect(screen.getByTestId("underwrite-release")).toBeDisabled();
    expect(screen.getByTestId("underwrite-release-hint")).toHaveTextContent(/once the invoice has settled/);
    fireEvent.click(screen.getByTestId("underwrite-release"));
    expect(mockRelease).not.toHaveBeenCalled();
  });

  it("enables Release after settlement and hides the stake form", () => {
    renderPanel("settled", cover({ user_stake: 500 }));
    expect(screen.queryByTestId("underwrite-form")).not.toBeInTheDocument();
    const release = screen.getByTestId("underwrite-release");
    expect(release).toBeEnabled();
    fireEvent.click(release);
    expect(mockRelease).toHaveBeenCalledWith({ wallet: "GUNDERWRITER" });
  });

  it("shows a released stake as released and not actionable", () => {
    renderPanel("settled", cover({ user_stake: 500, user_released: true }));
    expect(screen.getByTestId("underwrite-release")).toBeDisabled();
    expect(screen.getByTestId("underwrite-release")).toHaveTextContent("Released");
  });

  it("shows loss absorbed on a defaulted invoice", () => {
    renderPanel("defaulted", cover({ loss_absorbed: 1000 }));
    expect(screen.getByTestId("cover-meter-loss")).toHaveStyle({ width: "10%" });
    expect(screen.getByTestId("cover-meter-remaining")).toHaveTextContent("1,000 XLM absorbed by default");
  });
});
