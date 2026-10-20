import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuctionDetailView } from "../AuctionDetailView";
import { AuctionSettlementView } from "../AuctionSettlementView";
import type { Auction, AuctionBid } from "@/lib/api";

const mockAuction = vi.fn();
const mockBids = vi.fn();
const mockSettlement = vi.fn();
const mockMutation = vi.fn();
const mockWallet = vi.fn();

vi.mock("@/hooks/useAuction", () => ({
  useAuction: () => mockAuction(),
  useAuctionBids: () => mockBids(),
  useAuctionSettlement: () => mockSettlement(),
  usePlaceBidMutation: () => mockMutation(),
}));

vi.mock("@/context/WalletContext", () => ({
  useWallet: () => mockWallet(),
}));

function auction(overrides: Partial<Auction> = {}): Auction {
  return {
    id: "auc-1",
    invoice_id: "inv-1",
    invoice_title: "Acme receivable",
    seller: "GSELLERADDRESS",
    fraction_amount: 100,
    reserve_price: 1,
    highest_bid: 1.2,
    bid_count: 2,
    ends_at: new Date(Date.now() + 60_000).toISOString(),
    status: "active",
    ...overrides,
  };
}

function bids(overrides: Partial<AuctionBid> = {}): AuctionBid[] {
  return [
    {
      id: "b-1",
      bidder: "GBIDDERADDRESS",
      amount: 1.2,
      total: 120,
      created_at: "2026-10-20T12:00:00Z",
      ...overrides,
    },
  ];
}

describe("AuctionDetailView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWallet.mockReturnValue({ address: "GINV", isConnected: true });
    mockAuction.mockReturnValue({ data: auction(), isLoading: false, isError: false });
    mockBids.mockReturnValue({
      data: bids(),
      isLoading: false,
      isFetching: false,
      isError: false,
    });
    mockMutation.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ success: true, transaction_hash: "tx1" }),
      isPending: false,
    });
  });

  it("renders the seller, invoice and fraction amount", async () => {
    render(<AuctionDetailView auctionId="auc-1" />);
    expect(await screen.findByTestId("auction-invoice-title")).toHaveTextContent(
      "Acme receivable",
    );
    expect(screen.getByTestId("auction-seller")).toHaveTextContent("GSEL...RESS");
    expect(screen.getByTestId("auction-fraction-amount")).toHaveTextContent("100 fractions");
  });

  it("lists the bids highest first", async () => {
    mockBids.mockReturnValue({
      data: [
        { ...bids()[0], id: "b-1", amount: 1.2 },
        { ...bids()[0], id: "b-2", amount: 1.5 },
      ],
      isLoading: false,
      isFetching: false,
      isError: false,
    });
    render(<AuctionDetailView auctionId="auc-1" />);
    await waitFor(() =>
      expect(screen.getByTestId("auction-bid-amount-0")).toHaveTextContent("1.50 XLM"),
    );
    expect(screen.getByTestId("auction-bid-amount-1")).toHaveTextContent("1.20 XLM");
  });

  it("shows the reserve as met when the highest bid reaches it", async () => {
    mockAuction.mockReturnValue({
      data: auction({ reserve_price: 1, highest_bid: 1.2 }),
      isLoading: false,
      isError: false,
    });
    render(<AuctionDetailView auctionId="auc-1" />);
    expect(await screen.findByTestId("reserve-met")).toBeInTheDocument();
    expect(screen.queryByTestId("reserve-unmet")).toBeNull();
  });

  it("shows the reserve as unmet when the highest bid is below it", async () => {
    mockAuction.mockReturnValue({
      data: auction({ reserve_price: 2, highest_bid: 1.2 }),
      isLoading: false,
      isError: false,
    });
    render(<AuctionDetailView auctionId="auc-1" />);
    expect(await screen.findByTestId("reserve-unmet")).toBeInTheDocument();
    expect(screen.getByTestId("reserve-price")).toHaveTextContent("2.00 XLM");
  });

  it("shows the current highest bid as the minimum bid", async () => {
    render(<AuctionDetailView auctionId="auc-1" />);
    await waitFor(() =>
      expect(screen.getByTestId("bid-minimum")).toHaveTextContent("1.21 XLM"),
    );
  });

  it("submits the place_bid call with the entered amount", async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn().mockResolvedValue({ success: true, transaction_hash: "tx1" });
    mockMutation.mockReturnValue({ mutateAsync, isPending: false });

    render(<AuctionDetailView auctionId="auc-1" />);
    const input = await screen.findByTestId("bid-amount-input");
    await user.type(input, "1.5");
    await user.click(screen.getByTestId("place-bid-btn"));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({ amount: 1.5, wallet: "GINV" }),
    );
  });

  it("rejects a bid below the minimum", async () => {
    const user = userEvent.setup();
    render(<AuctionDetailView auctionId="auc-1" />);
    const input = await screen.findByTestId("bid-amount-input");
    await user.type(input, "0.5");
    expect(screen.getByTestId("place-bid-btn")).toBeDisabled();
  });

  it("does not accept bids once the auction has closed", async () => {
    mockAuction.mockReturnValue({
      data: auction({ status: "settled", ends_at: new Date(Date.now() - 1000).toISOString() }),
      isLoading: false,
      isError: false,
    });
    render(<AuctionDetailView auctionId="auc-1" />);
    expect(await screen.findByTestId("auction-bid-closed")).toBeInTheDocument();
    expect(screen.queryByTestId("place-bid-form")).toBeNull();
  });

  it("shows an error state when the auction cannot be loaded", async () => {
    mockAuction.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    render(<AuctionDetailView auctionId="auc-1" />);
    expect(await screen.findByTestId("auction-error")).toBeInTheDocument();
  });
});

describe("AuctionSettlementView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettlement.mockReturnValue({
      data: {
        auction_id: "auc-1",
        status: "settled",
        winner: "GWINNERADDRESS",
        clearing_price: 1.8,
        refunds: [{ wallet: "GLOSERADDRESS", amount: 150, status: "refunded" }],
      },
      isLoading: false,
      isError: false,
    });
  });

  it("shows the winner and the clearing price", async () => {
    render(<AuctionSettlementView auctionId="auc-1" />);
    expect(await screen.findByTestId("settlement-winner")).toHaveTextContent("GWIN...RESS");
    expect(screen.getByTestId("settlement-clearing-price")).toHaveTextContent("1.80 XLM");
  });

  it("shows the refund status of losing bidders", async () => {
    render(<AuctionSettlementView auctionId="auc-1" />);
    expect(await screen.findByTestId("settlement-refund-GLOSERADDRESS")).toBeInTheDocument();
    expect(screen.getByTestId("refund-status-refunded")).toBeInTheDocument();
  });

  it("marks a pending refund as pending", async () => {
    mockSettlement.mockReturnValue({
      data: {
        auction_id: "auc-1",
        status: "settled",
        winner: "GWINNERADDRESS",
        clearing_price: 1.8,
        refunds: [{ wallet: "GLOSERADDRESS", amount: 150, status: "pending" }],
      },
      isLoading: false,
      isError: false,
    });
    render(<AuctionSettlementView auctionId="auc-1" />);
    expect(await screen.findByTestId("refund-status-pending")).toBeInTheDocument();
  });

  it("shows a no-bid outcome", async () => {
    mockSettlement.mockReturnValue({
      data: {
        auction_id: "auc-1",
        status: "no_bid",
        winner: null,
        clearing_price: null,
        refunds: [],
      },
      isLoading: false,
      isError: false,
    });
    render(<AuctionSettlementView auctionId="auc-1" />);
    expect(await screen.findByTestId("settlement-no-bid")).toBeInTheDocument();
  });
});
