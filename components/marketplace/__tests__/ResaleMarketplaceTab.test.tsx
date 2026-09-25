import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResaleMarketplaceTab } from "../ResaleMarketplaceTab";
import type { ResaleListingData } from "../ResaleListing";

vi.mock("@/hooks/useCurrency", () => ({
  useCurrency: () => ({ format: (n: number) => `${n.toFixed(2)} XLM` }),
}));

const SELLER = "GSELLER00000000000000000000000000000000000000000000000";
const OTHER_SELLER = "GOTHER000000000000000000000000000000000000000000000000";
const VIEWER = "GVIEWER00000000000000000000000000000000000000000000000";

function makeListing(overrides: Partial<ResaleListingData> = {}): ResaleListingData {
  return {
    id: "listing-1",
    invoiceId: "inv-1",
    invoiceTitle: "Acme receivable",
    seller: SELLER,
    sharesOffered: 10,
    pricePerShare: 5,
    totalValue: 50,
    listedAt: "2026-09-01T00:00:00.000Z",
    status: "active",
    ...overrides,
  };
}

describe("ResaleMarketplaceTab", () => {
  it("shows an empty state when there are no active listings", () => {
    render(
      <ResaleMarketplaceTab
        invoiceId="inv-1"
        invoiceTitle="Acme receivable"
        listings={[]}
        onBuy={vi.fn()}
        onCancel={vi.fn()}
        onList={vi.fn()}
      />,
    );

    expect(screen.getByText("No resale listings available yet.")).toBeInTheDocument();
  });

  it("does not show the List My Shares toggle when the viewer holds no shares", () => {
    render(
      <ResaleMarketplaceTab
        invoiceId="inv-1"
        invoiceTitle="Acme receivable"
        myShares={0}
        listings={[]}
        onBuy={vi.fn()}
        onCancel={vi.fn()}
        onList={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("toggle-list-form")).not.toBeInTheDocument();
  });

  it("shows the List My Shares toggle when the viewer holds shares", () => {
    render(
      <ResaleMarketplaceTab
        invoiceId="inv-1"
        invoiceTitle="Acme receivable"
        myShares={10}
        listings={[]}
        onBuy={vi.fn()}
        onCancel={vi.fn()}
        onList={vi.fn()}
      />,
    );

    expect(screen.getByTestId("toggle-list-form")).toBeInTheDocument();
  });

  it("opens the list-shares form when the toggle is clicked", () => {
    render(
      <ResaleMarketplaceTab
        invoiceId="inv-1"
        invoiceTitle="Acme receivable"
        myShares={10}
        listings={[]}
        onBuy={vi.fn()}
        onCancel={vi.fn()}
        onList={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("toggle-list-form"));
    expect(screen.getByTestId("list-shares-form")).toBeInTheDocument();
  });

  it("calls onList and closes the form on submission", () => {
    const onList = vi.fn();
    render(
      <ResaleMarketplaceTab
        invoiceId="inv-1"
        invoiceTitle="Acme receivable"
        myShares={10}
        listings={[]}
        onBuy={vi.fn()}
        onCancel={vi.fn()}
        onList={onList}
      />,
    );

    fireEvent.click(screen.getByTestId("toggle-list-form"));
    fireEvent.change(screen.getByTestId("shares-input"), { target: { value: "3" } });
    fireEvent.change(screen.getByTestId("price-input"), { target: { value: "2" } });
    fireEvent.click(screen.getByTestId("submit-listing-btn"));

    expect(onList).toHaveBeenCalledWith({ invoiceId: "inv-1", shares: 3, pricePerShare: 2 });
    expect(screen.queryByTestId("list-shares-form")).not.toBeInTheDocument();
  });

  it("separates the viewer's own listings into a My Listings section", () => {
    render(
      <ResaleMarketplaceTab
        invoiceId="inv-1"
        invoiceTitle="Acme receivable"
        myShares={5}
        listings={[
          makeListing({ id: "mine", seller: SELLER }),
          makeListing({ id: "others", seller: OTHER_SELLER }),
        ]}
        onBuy={vi.fn()}
        onCancel={vi.fn()}
        onList={vi.fn()}
        currentAddress={SELLER}
      />,
    );

    expect(screen.getByText("My Listings")).toBeInTheDocument();
    expect(screen.getByTestId("resale-listing-mine")).toBeInTheDocument();
    expect(screen.getByTestId("resale-listing-others")).toBeInTheDocument();
  });

  it("excludes the viewer's own listings from the Available Listings section", () => {
    render(
      <ResaleMarketplaceTab
        invoiceId="inv-1"
        invoiceTitle="Acme receivable"
        listings={[
          makeListing({ id: "mine", seller: SELLER }),
          makeListing({ id: "others", seller: OTHER_SELLER }),
        ]}
        onBuy={vi.fn()}
        onCancel={vi.fn()}
        onList={vi.fn()}
        currentAddress={SELLER}
      />,
    );

    // Both listings count toward the total, but "mine" is rendered only once
    // (in My Listings above), not a second time as a buyable card here; only
    // "others" (not owned by the viewer) gets a Buy Shares button.
    expect(screen.getByText("Available Listings (2)")).toBeInTheDocument();
    expect(screen.getAllByTestId("resale-listing-mine")).toHaveLength(1);
    expect(screen.getAllByTestId("buy-resale-btn")).toHaveLength(1);
  });

  it("filters out cancelled and sold listings from the active count", () => {
    render(
      <ResaleMarketplaceTab
        invoiceId="inv-1"
        invoiceTitle="Acme receivable"
        listings={[
          makeListing({ id: "a", status: "active" }),
          makeListing({ id: "b", status: "sold" }),
          makeListing({ id: "c", status: "cancelled" }),
        ]}
        onBuy={vi.fn()}
        onCancel={vi.fn()}
        onList={vi.fn()}
      />,
    );

    expect(screen.getByText("Available Listings (1)")).toBeInTheDocument();
  });

  it("calls onBuy with the correct listing id", () => {
    const onBuy = vi.fn();
    render(
      <ResaleMarketplaceTab
        invoiceId="inv-1"
        invoiceTitle="Acme receivable"
        listings={[makeListing({ id: "listing-9", seller: OTHER_SELLER })]}
        onBuy={onBuy}
        onCancel={vi.fn()}
        onList={vi.fn()}
        currentAddress={VIEWER}
      />,
    );

    fireEvent.click(screen.getByTestId("buy-resale-btn"));
    expect(onBuy).toHaveBeenCalledWith("listing-9");
  });

  it("calls onCancel with the correct listing id", () => {
    const onCancel = vi.fn();
    render(
      <ResaleMarketplaceTab
        invoiceId="inv-1"
        invoiceTitle="Acme receivable"
        myShares={5}
        listings={[makeListing({ id: "listing-9", seller: SELLER })]}
        onBuy={vi.fn()}
        onCancel={onCancel}
        onList={vi.fn()}
        currentAddress={SELLER}
      />,
    );

    fireEvent.click(screen.getByTestId("cancel-listing-btn"));
    expect(onCancel).toHaveBeenCalledWith("listing-9");
  });
});
