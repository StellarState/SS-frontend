import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LimitOrderPanel } from "../LimitOrderPanel";
import type { LimitOrder } from "@/lib/api";

const mockOrders = vi.fn();
const mockPlaceMutate = vi.fn();
const mockCancelMutate = vi.fn();

vi.mock("@/hooks/useLimitOrders", () => ({
  useLimitOrders: () => mockOrders(),
  usePlaceLimitOrderMutation: () => ({
    mutate: mockPlaceMutate,
    isPending: false,
  }),
  useCancelLimitOrderMutation: () => ({
    mutate: mockCancelMutate,
    isPending: false,
    variables: null,
  }),
}));

vi.mock("@/hooks/useInvoiceOrderBook", () => ({
  useInvoiceOrderBook: () => ({
    data: {
      bids: [],
      asks: [
        { price: 95.0, quantity: 15 },
        { price: 100.0, quantity: 20 },
      ],
    },
    isLoading: false,
  }),
}));

const sampleOrders: LimitOrder[] = [
  {
    id: "ord-1",
    invoice_id: "inv-100",
    investor_address: "GINV",
    fraction_amount: 10,
    max_price_per_fraction: 100,
    total_escrowed: 1000,
    status: "open",
    created_at: "2026-11-20T10:00:00Z",
  },
];

describe("LimitOrderPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrders.mockReturnValue({
      data: sampleOrders,
      isLoading: false,
    });
  });

  it("prompts to connect a wallet when disconnected", () => {
    render(<LimitOrderPanel invoiceId="inv-100" walletAddress={null} />);
    expect(screen.getByTestId("limit-order-connect-prompt")).toBeInTheDocument();
  });

  it("validates protocol limits and displays pre-trade match preview", () => {
    render(<LimitOrderPanel invoiceId="inv-100" walletAddress="GINV" />);

    const fractionInput = screen.getByTestId("limit-order-fraction-input");
    const priceInput = screen.getByTestId("limit-order-price-input");
    const yieldInput = screen.getByTestId("limit-order-yield-input");

    // Enter valid order terms: 10 fractions @ max 100 XLM, 10% target yield
    fireEvent.change(fractionInput, { target: { value: "10" } });
    fireEvent.change(priceInput, { target: { value: "100" } });
    fireEvent.change(yieldInput, { target: { value: "10" } });

    expect(screen.getByTestId("limit-order-summary")).toBeInTheDocument();
    expect(screen.getByTestId("preview-matched-fractions")).toHaveTextContent("10 / 10");
    expect(screen.getByTestId("preview-price")).toHaveTextContent("95 XLM");
    expect(screen.getByTestId("preview-fee")).toBeInTheDocument();
    expect(screen.getByTestId("preview-yield")).toBeInTheDocument();
    expect(screen.getByTestId("limit-order-escrowed")).toHaveTextContent("1,000 XLM");
  });

  it("enforces binding action cryptographic signing before order submission", () => {
    render(<LimitOrderPanel invoiceId="inv-100" walletAddress="GINV" />);

    const fractionInput = screen.getByTestId("limit-order-fraction-input");
    const priceInput = screen.getByTestId("limit-order-price-input");
    const placeBtn = screen.getByTestId("place-limit-order-btn");

    fireEvent.change(fractionInput, { target: { value: "5" } });
    fireEvent.change(priceInput, { target: { value: "98" } });

    // Button must be disabled before signing
    expect(placeBtn).toBeDisabled();

    // Sign the order
    const signBtn = screen.getByTestId("sign-order-btn");
    fireEvent.click(signBtn);

    // After signing, button becomes enabled
    return waitFor(() => {
      expect(placeBtn).toBeEnabled();
      fireEvent.click(placeBtn);
      expect(mockPlaceMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          fraction_amount: 5,
          max_price_per_fraction: 98,
        }),
        expect.anything(),
      );
    });
  });

  it("filters orders by open, matched, cancelled, and expired states", () => {
    render(<LimitOrderPanel invoiceId="inv-100" walletAddress="GINV" />);

    // Default tab is 'open'
    expect(screen.getByTestId("limit-order-ord-1")).toBeInTheDocument();

    // Switch to 'matched' tab
    const matchedTab = screen.getByRole("tab", { name: "Matched" });
    fireEvent.mouseDown(matchedTab, { button: 0 });

    expect(screen.getByTestId("limit-order-ord-m1")).toBeInTheDocument();
    expect(screen.getByTestId("order-status-ord-m1")).toHaveTextContent("Matched");

    // Switch to 'cancelled' tab
    const cancelledTab = screen.getByRole("tab", { name: "Cancelled" });
    fireEvent.mouseDown(cancelledTab, { button: 0 });

    expect(screen.getByTestId("limit-order-ord-c1")).toBeInTheDocument();
    expect(screen.getByTestId("order-status-ord-c1")).toHaveTextContent("cancelled");
  });

  it("requires confirmation dialog before cancelling an active order", () => {
    render(<LimitOrderPanel invoiceId="inv-100" walletAddress="GINV" />);

    const cancelTrigger = screen.getByTestId("cancel-order-ord-1");
    fireEvent.click(cancelTrigger);

    // Mutation must NOT be called immediately; dialog must appear
    expect(mockCancelMutate).not.toHaveBeenCalled();
    expect(screen.getByTestId("cancel-order-confirm-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("cancel-order-confirm-dialog")).toHaveTextContent(
      "Confirm Order Cancellation",
    );

    // Confirm cancel
    const confirmBtn = screen.getByTestId("confirm-cancel-order-btn");
    fireEvent.click(confirmBtn);

    expect(mockCancelMutate).toHaveBeenCalledWith("ord-1", expect.anything());
  });
});
