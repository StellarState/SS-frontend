import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreateListingModal } from "../CreateListingModal";

const balanceState = { balance: 100 as number | null };

vi.mock("@/context/WalletContext", () => ({
  useWallet: () => ({ address: "GSELLER", network: "testnet" }),
}));
vi.mock("@/hooks/useUsdcBalance", () => ({
  useUsdcBalance: () => ({ balance: balanceState.balance, refresh: vi.fn() }),
}));
vi.mock("@/lib/listingFee", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/listingFee")>();
  return {
    ...actual,
    fetchListingFeeConfig: vi.fn().mockResolvedValue({ fee_bps: 200, treasury: "GTREASURY" }),
    createListing: vi.fn().mockResolvedValue({ id: "l1" }),
  };
});
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
});

function renderModal() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CreateListingModal
        invoiceId="inv-1"
        invoiceName="Invoice One"
        availableQuantity={20}
        open
        onOpenChange={vi.fn()}
      />
    </QueryClientProvider>
  );
}

function renderModalWithQuote(quoteExpiresAt: number) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CreateListingModal
        invoiceId="inv-1"
        invoiceName="Invoice One"
        availableQuantity={20}
        open
        onOpenChange={vi.fn()}
        initialQuantity={2}
        initialPrice={50}
        quoteExpiresAt={quoteExpiresAt}
      />
    </QueryClientProvider>
  );
}

function fill(quantity: string, price: string) {
  fireEvent.change(screen.getByTestId("listing-quantity-input"), { target: { value: quantity } });
  fireEvent.change(screen.getByTestId("listing-price-input"), { target: { value: price } });
}

describe("CreateListingModal fee preview (issue #496)", () => {
  it("updates fee and net proceeds as the amount changes", async () => {
    balanceState.balance = 100;
    renderModal();
    await waitFor(() => expect(screen.getByTestId("listing-fee-amount")).not.toHaveTextContent("Loading"));

    fill("10", "50");
    expect(screen.getByTestId("listing-net-proceeds")).toHaveTextContent("490.00 XLM");

    fill("20", "50");
    expect(screen.getByTestId("listing-net-proceeds")).toHaveTextContent("980.00 XLM");
    expect(screen.getByTestId("listing-confirm")).toBeEnabled();
  });

  it("warns and disables confirm when the balance cannot cover the fee", async () => {
    balanceState.balance = 5;
    renderModal();
    await waitFor(() => expect(screen.getByTestId("listing-fee-amount")).not.toHaveTextContent("Loading"));

    fill("10", "50");
    expect(screen.getByTestId("listing-insufficient-balance")).toBeInTheDocument();
    expect(screen.getByTestId("listing-confirm")).toBeDisabled();
  });

  it("shows where the fee is charged from", async () => {
    balanceState.balance = 100;
    renderModal();
    expect(screen.getByTestId("listing-fee-source")).toHaveTextContent("Wallet balance");
  });

  it("prefills quoted listing terms and disables submission after quote expiry", async () => {
    balanceState.balance = 100;
    renderModalWithQuote(Date.now() - 1);
    await waitFor(() => expect(screen.getByTestId("listing-fee-amount")).not.toHaveTextContent("Loading"));

    expect(screen.getByTestId("listing-quantity-input")).toHaveValue(2);
    expect(screen.getByTestId("listing-price-input")).toHaveValue(50);
    expect(screen.getByTestId("listing-quantity-input")).toHaveAttribute("readonly");
    expect(screen.getByTestId("listing-price-input")).toHaveAttribute("readonly");
    expect(screen.getByTestId("listing-quote-expiry")).toHaveTextContent("quote expired");
    expect(screen.getByTestId("listing-confirm")).toBeDisabled();
  });
});
