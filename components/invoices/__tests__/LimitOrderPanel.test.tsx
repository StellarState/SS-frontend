import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LimitOrderPanel, LimitOrderForm, ActiveOrdersList } from "../LimitOrderPanel";
import type { ExtendedLimitOrder, ActiveListingCandidate } from "@/lib/analytics/limitOrders";

// Mock hooks
const mockMutatePlace = vi.fn();
const mockMutateCancel = vi.fn();

vi.mock("@/hooks/useLimitOrders", () => ({
  useLimitOrders: vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
  })),
  usePlaceLimitOrderMutation: vi.fn(() => ({
    mutate: mockMutatePlace,
    isPending: false,
  })),
  useCancelLimitOrderMutation: vi.fn(() => ({
    mutate: mockMutateCancel,
    isPending: false,
    variables: null,
  })),
}));

describe("LimitOrderPanel & LimitOrderForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCandidateListing: ActiveListingCandidate = {
    id: "listing-1",
    seller_address: "GBSELLER...",
    price_per_fraction: 98.5,
    available_fractions: 50,
    invoice_annual_yield: 14.5,
  };

  it("renders connect prompt when wallet is disconnected", () => {
    render(<LimitOrderPanel invoiceId="inv-1" walletAddress={null} />);
    expect(screen.getByTestId("limit-order-connect-prompt")).toHaveTextContent(
      "Connect a wallet to place a limit order."
    );
  });

  it("validates protocol limits and blocks invalid submissions", async () => {
    render(<LimitOrderForm invoiceId="inv-1" />);

    const user = userEvent.setup();
    const fractionInput = screen.getByTestId("limit-order-fraction-input");
    const priceInput = screen.getByTestId("limit-order-price-input");
    const yieldInput = screen.getByTestId("limit-order-yield-input");
    const submitBtn = screen.getByTestId("place-limit-order-btn");

    expect(submitBtn).toBeDisabled();

    // Below protocol min price (0.01 XLM)
    await user.type(fractionInput, "10");
    await user.type(priceInput, "0.001");
    expect(screen.getByTestId("error-max-price")).toHaveTextContent(
      "Price cannot be lower than protocol minimum (0.01 XLM)."
    );
    expect(submitBtn).toBeDisabled();

    // Above protocol cap price
    await user.clear(priceInput);
    await user.type(priceInput, "200000");
    expect(screen.getByTestId("error-max-price")).toHaveTextContent(
      "Price cannot exceed protocol maximum (100,000 XLM)."
    );
    expect(submitBtn).toBeDisabled();

    // Above protocol cap yield (50%)
    await user.clear(priceInput);
    await user.type(priceInput, "100");
    await user.type(yieldInput, "65");
    expect(screen.getByTestId("error-target-yield")).toHaveTextContent(
      "Target yield cannot exceed protocol cap (50%)."
    );
    expect(submitBtn).toBeDisabled();
  });

  it("displays match preview with price, fees and yield when inputs are valid", async () => {
    render(
      <LimitOrderForm
        invoiceId="inv-1"
        candidateListing={mockCandidateListing}
      />
    );

    const user = userEvent.setup();
    const fractionInput = screen.getByTestId("limit-order-fraction-input");
    const priceInput = screen.getByTestId("limit-order-price-input");
    const yieldInput = screen.getByTestId("limit-order-yield-input");

    await user.type(fractionInput, "20");
    await user.type(priceInput, "100");
    await user.type(yieldInput, "12");

    // Check preview region
    const preview = screen.getByTestId("limit-order-match-preview");
    expect(preview).toBeInTheDocument();
    expect(screen.getByTestId("preview-matched-price")).toHaveTextContent("98.5 XLM");
    expect(screen.getByTestId("preview-fee")).toBeInTheDocument();
    expect(screen.getByTestId("preview-effective-yield")).toHaveTextContent("14.50%");
    expect(screen.getByTestId("preview-net-total")).toBeInTheDocument();

    // Form can now be submitted
    const submitBtn = screen.getByTestId("place-limit-order-btn");
    expect(submitBtn).toBeEnabled();

    await user.click(submitBtn);
    expect(mockMutatePlace).toHaveBeenCalledWith(
      expect.objectContaining({
        invoice_id: "inv-1",
        fraction_amount: 20,
        max_price_per_fraction: 100,
      }),
      expect.anything()
    );
  });
});

describe("ActiveOrdersList & Cancellation Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleOrders: ExtendedLimitOrder[] = [
    {
      id: "ord-open",
      invoice_id: "inv-1",
      buyer_address: "GBBUYER...",
      fraction_amount: 15,
      max_price_per_fraction: 95,
      total_escrowed: 1425,
      status: "open",
      created_at: "2026-11-20T10:00:00Z",
      expires_at: "2026-12-20T10:00:00Z",
    },
    {
      id: "ord-matched",
      invoice_id: "inv-1",
      buyer_address: "GBBUYER...",
      fraction_amount: 10,
      max_price_per_fraction: 100,
      total_escrowed: 1000,
      status: "matched",
      created_at: "2026-11-18T10:00:00Z",
      expires_at: "2026-12-18T10:00:00Z",
      matched_at: "2026-11-19T14:30:00Z",
      matched_price_per_fraction: 98,
      execution_fee: 4.9,
      effective_yield: 12.5,
    },
    {
      id: "ord-cancelled",
      invoice_id: "inv-1",
      buyer_address: "GBBUYER...",
      fraction_amount: 5,
      max_price_per_fraction: 90,
      total_escrowed: 450,
      status: "cancelled",
      created_at: "2026-11-15T10:00:00Z",
      expires_at: "2026-12-15T10:00:00Z",
      cancelled_at: "2026-11-16T12:00:00Z",
      cancellation_reason: "User cancelled",
    },
    {
      id: "ord-expired",
      invoice_id: "inv-1",
      buyer_address: "GBBUYER...",
      fraction_amount: 8,
      max_price_per_fraction: 92,
      total_escrowed: 736,
      status: "expired",
      created_at: "2026-10-01T10:00:00Z",
      expires_at: "2026-11-01T10:00:00Z",
    },
  ];

  it("filters orders across open, matched, cancelled and expired views", async () => {
    render(
      <ActiveOrdersList
        walletAddress="GBBUYER..."
        ordersOverride={sampleOrders}
      />
    );

    // Default tab is 'open'
    expect(screen.getByTestId("limit-order-ord-open")).toBeInTheDocument();
    expect(screen.queryByTestId("limit-order-ord-matched")).not.toBeInTheDocument();

    // Click 'matched' tab
    fireEvent.click(screen.getByTestId("tab-matched"));
    expect(screen.getByTestId("limit-order-ord-matched")).toBeInTheDocument();
    expect(screen.getByTestId("audit-matched-ord-matched")).toHaveTextContent(
      /Matched at .* @ 98 XLM/
    );

    // Click 'cancelled' tab
    fireEvent.click(screen.getByTestId("tab-cancelled"));
    expect(screen.getByTestId("limit-order-ord-cancelled")).toBeInTheDocument();
    expect(screen.getByTestId("audit-cancelled-ord-cancelled")).toHaveTextContent(
      /Cancelled on .* Reason: User cancelled/
    );

    // Click 'expired' tab
    fireEvent.click(screen.getByTestId("tab-expired"));
    expect(screen.getByTestId("limit-order-ord-expired")).toBeInTheDocument();
    expect(screen.getByTestId("audit-expired-ord-expired")).toHaveTextContent(
      "Order reached expiry date"
    );

    // Click 'all' tab
    fireEvent.click(screen.getByTestId("tab-all"));
    expect(screen.getByTestId("limit-order-ord-open")).toBeInTheDocument();
    expect(screen.getByTestId("limit-order-ord-matched")).toBeInTheDocument();
    expect(screen.getByTestId("limit-order-ord-cancelled")).toBeInTheDocument();
    expect(screen.getByTestId("limit-order-ord-expired")).toBeInTheDocument();
  });

  it("requires confirmation to cancel an open order and allows cancelling", async () => {
    render(
      <ActiveOrdersList
        walletAddress="GBBUYER..."
        ordersOverride={sampleOrders}
      />
    );

    // Cancel button on open order
    const cancelBtn = screen.getByTestId("cancel-order-ord-open");
    expect(cancelBtn).toBeInTheDocument();

    // Click cancel button -> Confirmation dialog opens
    fireEvent.click(cancelBtn);
    expect(screen.getByTestId("cancel-confirm-box-ord-open")).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to cancel this order\?/i)).toBeInTheDocument();

    // Abort button closes confirmation
    const abortBtn = screen.getByTestId("abort-cancel-btn-ord-open");
    fireEvent.click(abortBtn);
    expect(screen.queryByTestId("cancel-confirm-box-ord-open")).not.toBeInTheDocument();
    expect(mockMutateCancel).not.toHaveBeenCalled();

    // Open confirmation again and confirm
    fireEvent.click(cancelBtn);
    const confirmBtn = screen.getByTestId("confirm-cancel-btn-ord-open");
    fireEvent.click(confirmBtn);

    expect(mockMutateCancel).toHaveBeenCalledWith("ord-open", expect.anything());
  });

  it("expired orders cannot execute or show cancel button", () => {
    render(
      <ActiveOrdersList
        walletAddress="GBBUYER..."
        ordersOverride={[sampleOrders[3]]}
      />
    );

    fireEvent.click(screen.getByTestId("tab-all"));
    // Expired orders must not render cancel button
    expect(screen.queryByTestId("cancel-order-ord-expired")).not.toBeInTheDocument();
    expect(screen.getByTestId("order-status-ord-expired")).toHaveTextContent("EXPIRED");
  });
});
