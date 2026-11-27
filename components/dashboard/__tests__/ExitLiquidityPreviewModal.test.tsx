import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExitLiquidityPreviewModal } from "../ExitLiquidityPreviewModal";
import type { InvoiceOrderBook } from "@/lib/api";
import type { InvestmentPosition } from "@/lib/portfolio";

const orderBookState = vi.hoisted(() => ({
  result: {
    data: {
      bids: [
        { price: 9.8, quantity: 3 },
        { price: 9.5, quantity: 4 },
      ],
      asks: [{ price: 10, quantity: 5 }],
    } as InvoiceOrderBook | undefined,
    isLoading: false,
    isError: false,
    isFetching: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
}));

vi.mock("@/hooks/useInvoiceOrderBook", () => ({
  useInvoiceOrderBook: () => orderBookState.result,
}));

function makePosition(overrides: Partial<InvestmentPosition> = {}): InvestmentPosition {
  return {
    invoice_id: "invoice-1",
    invoice_title: "Position One",
    committed_amount: 50,
    status: "active",
    quantity: 5,
    ...overrides,
  };
}

function renderPreview(position = makePosition(), onContinueToListing = vi.fn()) {
  return {
    onContinueToListing,
    ...render(
      <ExitLiquidityPreviewModal
        position={position}
        open
        onOpenChange={vi.fn()}
        onContinueToListing={onContinueToListing}
      />,
    ),
  };
}

describe("ExitLiquidityPreviewModal", () => {
  it("shows immediate depth, slippage, partial/full timing and creates a short-lived quote", () => {
    orderBookState.result = {
      ...orderBookState.result,
      data: {
        bids: [
          { price: 9.8, quantity: 3 },
          { price: 9.5, quantity: 4 },
        ],
        asks: [{ price: 10, quantity: 5 }],
      },
    };
    const onContinueToListing = vi.fn();
    renderPreview(makePosition(), onContinueToListing);

    expect(screen.getByTestId("exit-bid-depth")).toHaveTextContent("7 fractions");
    expect(screen.getByTestId("exit-partial-timing")).toHaveTextContent("Now");
    expect(screen.getByTestId("exit-full-timing")).toHaveTextContent("Now, at current depth");
    expect(screen.getByTestId("exit-slippage-range").textContent).toMatch(/%–.*%/);

    fireEvent.change(screen.getByTestId("exit-quote-quantity"), { target: { value: "2" } });
    fireEvent.click(screen.getByTestId("create-exit-quote"));
    expect(screen.getByTestId("exit-quote")).toHaveTextContent("Indicative quote: 2 fractions");
    fireEvent.click(screen.getByTestId("continue-exit-listing"));
    expect(onContinueToListing).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: 2, estimatedProceeds: 19.6, limitPrice: 9.8 }),
    );
  });

  it("does not display estimates for a market without buy orders", () => {
    orderBookState.result = {
      ...orderBookState.result,
      data: { bids: [], asks: [] },
    };
    renderPreview();

    expect(screen.getByTestId("exit-market-unavailable")).toBeInTheDocument();
    expect(screen.queryByTestId("exit-slippage-range")).not.toBeInTheDocument();
    expect(screen.queryByTestId("exit-partial-timing")).not.toBeInTheDocument();
  });

  it("shows a release date and prevents a locked position from creating a quote", () => {
    orderBookState.result = {
      ...orderBookState.result,
      data: { bids: [{ price: 9, quantity: 10 }], asks: [] },
    };
    renderPreview(makePosition({ lockup_expires_at: "2030-01-01T00:00:00.000Z" }));

    expect(screen.getByTestId("exit-lock-release")).toHaveTextContent("earliest exit eligibility");
    expect(screen.getByTestId("exit-partial-timing")).toHaveTextContent("Unavailable while locked");
    expect(screen.queryByTestId("create-exit-quote")).not.toBeInTheDocument();
  });

  it("does not estimate full exit timing beyond current bid depth", () => {
    orderBookState.result = {
      ...orderBookState.result,
      data: { bids: [{ price: 9, quantity: 2 }], asks: [] },
    };
    renderPreview(makePosition({ quantity: 5 }));

    expect(screen.getByTestId("exit-full-timing")).toHaveTextContent(
      "Beyond current depth: timing unavailable",
    );
    expect(screen.getByTestId("scheduled-exit")).toHaveTextContent(
      "No historical sell-volume estimate is available",
    );
  });
});
