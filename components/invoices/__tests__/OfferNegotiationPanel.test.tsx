import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  OfferNegotiationPanel,
  OfferBuilder,
  OfferInbox,
} from "../OfferNegotiationPanel";
import type { SecondaryOffer, ListingReference } from "@/lib/analytics/offerNegotiation";

const mockCreateMutate = vi.fn();
const mockAcceptMutate = vi.fn();
const mockRejectMutate = vi.fn();
const mockCancelMutate = vi.fn();

vi.mock("@/hooks/useOfferNegotiation", () => ({
  useSecondaryOffers: vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
  })),
  useCreateOfferMutation: vi.fn(() => ({
    mutate: mockCreateMutate,
    isPending: false,
  })),
  useAcceptOfferMutation: vi.fn(() => ({
    mutate: mockAcceptMutate,
    isPending: false,
  })),
  useRejectOfferMutation: vi.fn(() => ({
    mutate: mockRejectMutate,
    isPending: false,
  })),
  useCancelOfferMutation: vi.fn(() => ({
    mutate: mockCancelMutate,
    isPending: false,
  })),
}));

describe("OfferNegotiationPanel & OfferBuilder (#687)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockListing: ListingReference = {
    id: "list-1",
    seller_address: "GBSELLER123",
    price_per_fraction: 100,
    available_quantity: 40,
    fair_value_per_fraction: 95,
    invoice_annual_yield: 12.0,
  };

  it("renders connect prompt when wallet is disconnected", () => {
    render(<OfferNegotiationPanel invoiceId="inv-1" walletAddress={null} />);
    expect(screen.getByTestId("offer-connect-prompt")).toHaveTextContent(
      "Connect a wallet to negotiate and place binding offers."
    );
  });

  it("renders no-listing prompt when activeListing is missing", () => {
    render(
      <OfferNegotiationPanel
        invoiceId="inv-1"
        walletAddress="GBUSER..."
        activeListing={null}
      />
    );
    expect(screen.getByTestId("offer-no-listing-prompt")).toHaveTextContent(
      "Select a secondary market listing to make an offer."
    );
  });

  it("validates offer inputs and shows fair-value reference", async () => {
    render(
      <OfferBuilder
        invoiceId="inv-1"
        walletAddress="GBBUYER456"
        activeListing={mockListing}
      />
    );

    const user = userEvent.setup();
    const qtyInput = screen.getByTestId("offer-quantity-input");
    const priceInput = screen.getByTestId("offer-price-input");
    const submitBtn = screen.getByTestId("submit-offer-btn");

    expect(screen.getByTestId("fair-value-reference")).toHaveTextContent("95 XLM");
    expect(submitBtn).toBeDisabled();

    // Excess quantity validation
    await user.type(qtyInput, "50");
    await user.type(priceInput, "90");
    expect(screen.getByTestId("error-offer-quantity")).toHaveTextContent(
      "Quantity cannot exceed available listing amount (40)."
    );
    expect(submitBtn).toBeDisabled();

    // Fix quantity to 10
    await user.clear(qtyInput);
    await user.type(qtyInput, "10");
    expect(screen.queryByTestId("error-offer-quantity")).not.toBeInTheDocument();

    // Check Fair-Value Impact banner
    expect(screen.getByTestId("offer-impact-card")).toBeInTheDocument();
    expect(screen.getByTestId("discount-premium-badge")).toHaveTextContent(/Below Fair Value/i);
    expect(screen.getByTestId("impact-total-amount")).toHaveTextContent("900 XLM");
    expect(screen.getByTestId("impact-projected-yield")).toHaveTextContent("12.67% APY");

    // Check signature requirement
    expect(submitBtn).toBeDisabled();
    const sigCheckbox = screen.getByTestId("offer-signature-checkbox");
    await user.click(sigCheckbox);

    // Form can now be submitted
    expect(submitBtn).toBeEnabled();
    await user.click(submitBtn);

    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        invoice_id: "inv-1",
        listing_id: "list-1",
        quantity: 10,
        price_per_fraction: 90,
      }),
      expect.anything()
    );
  });
});

describe("OfferInbox & Negotiation Workflows (#687)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleOffers: SecondaryOffer[] = [
    {
      id: "off-incoming",
      invoice_id: "inv-1",
      listing_id: "list-1",
      buyer_address: "GBBUYER111",
      seller_address: "GBSELLER123",
      quantity: 15,
      price_per_fraction: 92,
      total_offer_amount: 1380,
      fair_value_per_fraction: 95,
      discount_premium_percent: -3.16,
      effective_yield_percent: 12.39,
      created_at: "2026-11-20T10:00:00Z",
      expires_at: "2026-11-23T10:00:00Z",
      status: "pending",
    },
    {
      id: "off-outgoing",
      invoice_id: "inv-1",
      listing_id: "list-2",
      buyer_address: "GBSELLER123", // Current user is buyer here
      seller_address: "GBOTHER888",
      quantity: 5,
      price_per_fraction: 94,
      total_offer_amount: 470,
      fair_value_per_fraction: 95,
      discount_premium_percent: -1.05,
      effective_yield_percent: 12.13,
      created_at: "2026-11-20T11:00:00Z",
      expires_at: "2026-11-23T11:00:00Z",
      status: "pending",
    },
    {
      id: "off-accepted",
      invoice_id: "inv-1",
      listing_id: "list-1",
      buyer_address: "GBBUYER222",
      seller_address: "GBSELLER123",
      quantity: 8,
      price_per_fraction: 96,
      total_offer_amount: 768,
      fair_value_per_fraction: 95,
      discount_premium_percent: 1.05,
      effective_yield_percent: 11.88,
      created_at: "2026-11-18T10:00:00Z",
      expires_at: "2026-11-20T10:00:00Z",
      status: "accepted",
      settlement_status: "queued",
      resolved_at: "2026-11-19T10:00:00Z",
    },
    {
      id: "off-rejected",
      invoice_id: "inv-1",
      listing_id: "list-1",
      buyer_address: "GBBUYER333",
      seller_address: "GBSELLER123",
      quantity: 20,
      price_per_fraction: 80,
      total_offer_amount: 1600,
      fair_value_per_fraction: 95,
      discount_premium_percent: -15.79,
      effective_yield_percent: 14.25,
      created_at: "2026-11-17T10:00:00Z",
      expires_at: "2026-11-19T10:00:00Z",
      status: "rejected",
      rejection_reason: "Bid is too low",
      resolved_at: "2026-11-18T10:00:00Z",
    },
    {
      id: "off-expired",
      invoice_id: "inv-1",
      listing_id: "list-1",
      buyer_address: "GBBUYER444",
      seller_address: "GBSELLER123",
      quantity: 12,
      price_per_fraction: 91,
      total_offer_amount: 1092,
      fair_value_per_fraction: 95,
      discount_premium_percent: -4.21,
      effective_yield_percent: 12.53,
      created_at: "2026-10-01T10:00:00Z",
      expires_at: "2026-10-02T10:00:00Z",
      status: "expired",
    },
  ];

  it("filters across incoming, outgoing, and audit history tabs", () => {
    render(
      <OfferInbox
        walletAddress="GBSELLER123"
        offersOverride={sampleOffers}
      />
    );

    // Default tab: incoming
    expect(screen.getByTestId("offer-card-off-incoming")).toBeInTheDocument();
    expect(screen.queryByTestId("offer-card-off-outgoing")).not.toBeInTheDocument();

    // Outgoing tab
    fireEvent.click(screen.getByTestId("tab-offer-outgoing"));
    expect(screen.getByTestId("offer-card-off-outgoing")).toBeInTheDocument();
    expect(screen.queryByTestId("offer-card-off-incoming")).not.toBeInTheDocument();

    // Audit History tab
    fireEvent.click(screen.getByTestId("tab-offer-history"));
    expect(screen.getByTestId("offer-card-off-accepted")).toBeInTheDocument();
    expect(screen.getByTestId("offer-card-off-rejected")).toBeInTheDocument();
    expect(screen.getByTestId("offer-card-off-expired")).toBeInTheDocument();
    expect(screen.getByText(/In Settlement Queue/i)).toBeInTheDocument();
    expect(screen.getByTestId("audit-rejected-off-rejected")).toHaveTextContent(
      "Rejected: Bid is too low"
    );
    expect(screen.getByTestId("audit-expired-off-expired")).toHaveTextContent(
      "Offer has expired"
    );
  });

  it("authorizes seller to accept incoming offer and enters settlement", () => {
    render(
      <OfferInbox
        walletAddress="GBSELLER123"
        offersOverride={[sampleOffers[0]]}
      />
    );

    const acceptBtn = screen.getByTestId("accept-offer-btn-off-incoming");
    expect(acceptBtn).toBeInTheDocument();

    fireEvent.click(acceptBtn);
    expect(mockAcceptMutate).toHaveBeenCalledWith({ offerId: "off-incoming" });
  });

  it("authorizes seller to reject incoming offer with reason dialog", async () => {
    const user = userEvent.setup();
    render(
      <OfferInbox
        walletAddress="GBSELLER123"
        offersOverride={[sampleOffers[0]]}
      />
    );

    const rejectBtn = screen.getByTestId("reject-offer-btn-off-incoming");
    await user.click(rejectBtn);

    // Rejection modal appears
    expect(screen.getByTestId("reject-modal-off-incoming")).toBeInTheDocument();
    const reasonInput = screen.getByTestId("rejection-reason-input-off-incoming");
    await user.type(reasonInput, "Not acceptable price");

    const confirmRejectBtn = screen.getByTestId("confirm-reject-btn-off-incoming");
    await user.click(confirmRejectBtn);

    expect(mockRejectMutate).toHaveBeenCalledWith(
      { offerId: "off-incoming", reason: "Not acceptable price" },
      expect.anything()
    );
  });

  it("authorizes buyer to cancel outgoing offer", () => {
    render(
      <OfferInbox
        walletAddress="GBSELLER123" // Current user is buyer on off-outgoing
        offersOverride={[sampleOffers[1]]}
      />
    );

    fireEvent.click(screen.getByTestId("tab-offer-outgoing"));
    const cancelBtn = screen.getByTestId("cancel-offer-btn-off-outgoing");
    expect(cancelBtn).toBeInTheDocument();

    fireEvent.click(cancelBtn);
    expect(mockCancelMutate).toHaveBeenCalledWith({ offerId: "off-outgoing" });
  });

  it("expired offers block actions and show audit warning", () => {
    render(
      <OfferInbox
        walletAddress="GBSELLER123"
        offersOverride={[sampleOffers[4]]}
      />
    );

    fireEvent.click(screen.getByTestId("tab-offer-all"));
    expect(screen.queryByTestId("accept-offer-btn-off-expired")).not.toBeInTheDocument();
    expect(screen.queryByTestId("reject-offer-btn-off-expired")).not.toBeInTheDocument();
    expect(screen.queryByTestId("cancel-offer-btn-off-expired")).not.toBeInTheDocument();
    expect(screen.getByTestId("audit-expired-off-expired")).toBeInTheDocument();
  });
});
