import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResaleListingCard, ListSharesForm, type ResaleListingData } from "../ResaleListing";

vi.mock("@/hooks/useCurrency", () => ({
  useCurrency: () => ({ format: (n: number) => `${n.toFixed(2)} XLM` }),
}));

function makeListing(overrides: Partial<ResaleListingData> = {}): ResaleListingData {
  return {
    id: "listing-1",
    invoiceId: "inv-1",
    invoiceTitle: "Acme receivable",
    seller: "GSELLER00000000000000000000000000000000000000000000000",
    sharesOffered: 10,
    pricePerShare: 5,
    totalValue: 50,
    listedAt: "2026-09-01T00:00:00.000Z",
    status: "active",
    ...overrides,
  };
}

describe("ResaleListingCard", () => {
  it("renders listing details", () => {
    render(<ResaleListingCard listing={makeListing()} />);

    expect(screen.getByText("Acme receivable")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("shows a Buy Shares button for a non-seller viewing an active listing", () => {
    const onBuy = vi.fn();
    render(
      <ResaleListingCard
        listing={makeListing()}
        onBuy={onBuy}
        currentAddress="GBUYER0000000000000000000000000000000000000000000000000"
      />,
    );

    const buyButton = screen.getByTestId("buy-resale-btn");
    fireEvent.click(buyButton);
    expect(onBuy).toHaveBeenCalledWith("listing-1");
  });

  it("does not show a Buy Shares button to the listing's own seller", () => {
    render(
      <ResaleListingCard
        listing={makeListing()}
        onBuy={vi.fn()}
        currentAddress="GSELLER00000000000000000000000000000000000000000000000"
      />,
    );

    expect(screen.queryByTestId("buy-resale-btn")).not.toBeInTheDocument();
  });

  it("shows a Cancel Listing button to the seller of an active listing", () => {
    const onCancel = vi.fn();
    render(
      <ResaleListingCard
        listing={makeListing()}
        onCancel={onCancel}
        currentAddress="GSELLER00000000000000000000000000000000000000000000000"
      />,
    );

    const cancelButton = screen.getByTestId("cancel-listing-btn");
    fireEvent.click(cancelButton);
    expect(onCancel).toHaveBeenCalledWith("listing-1");
  });

  it("does not show a Cancel Listing button for a cancelled listing", () => {
    render(
      <ResaleListingCard
        listing={makeListing({ status: "cancelled" })}
        onCancel={vi.fn()}
        currentAddress="GSELLER00000000000000000000000000000000000000000000000"
      />,
    );

    expect(screen.queryByTestId("cancel-listing-btn")).not.toBeInTheDocument();
  });

  it("does not show a Buy Shares button for a sold listing", () => {
    render(
      <ResaleListingCard
        listing={makeListing({ status: "sold" })}
        onBuy={vi.fn()}
        currentAddress="GBUYER0000000000000000000000000000000000000000000000000"
      />,
    );

    expect(screen.queryByTestId("buy-resale-btn")).not.toBeInTheDocument();
  });
});

describe("ListSharesForm", () => {
  it("computes total value from shares and price", () => {
    render(<ListSharesForm invoiceId="inv-1" maxShares={20} onSubmit={vi.fn()} />);

    fireEvent.change(screen.getByTestId("shares-input"), { target: { value: "4" } });
    fireEvent.change(screen.getByTestId("price-input"), { target: { value: "2.5" } });

    expect(screen.getByText("10.00 XLM")).toBeInTheDocument();
  });

  it("disables submit until shares and price are both valid", () => {
    render(<ListSharesForm invoiceId="inv-1" maxShares={20} onSubmit={vi.fn()} />);

    const submitButton = screen.getByTestId("submit-listing-btn");
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByTestId("price-input"), { target: { value: "2.5" } });
    expect(submitButton).not.toBeDisabled();
  });

  it("disables submit when shares exceed the max held balance", () => {
    render(<ListSharesForm invoiceId="inv-1" maxShares={5} onSubmit={vi.fn()} />);

    fireEvent.change(screen.getByTestId("shares-input"), { target: { value: "10" } });
    fireEvent.change(screen.getByTestId("price-input"), { target: { value: "2.5" } });

    expect(screen.getByTestId("submit-listing-btn")).toBeDisabled();
  });

  it("calls onSubmit with the entered shares and price", () => {
    const onSubmit = vi.fn();
    render(<ListSharesForm invoiceId="inv-1" maxShares={20} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByTestId("shares-input"), { target: { value: "4" } });
    fireEvent.change(screen.getByTestId("price-input"), { target: { value: "2.5" } });
    fireEvent.click(screen.getByTestId("submit-listing-btn"));

    expect(onSubmit).toHaveBeenCalledWith({
      invoiceId: "inv-1",
      shares: 4,
      pricePerShare: 2.5,
    });
  });
});
