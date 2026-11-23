import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { PayoutWaterfall } from "../PayoutWaterfall";

function respond(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

function renderWaterfall() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<PayoutWaterfall invoiceId="inv-1" />, { wrapper });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const classes = [
  { id: "senior", label: "Senior", priority: 1, owed: 100, paid: 100, shortfall: 0, user_payout: 0 },
  { id: "junior", label: "Junior", priority: 2, owed: 50, paid: 0, shortfall: 50, user_payout: 0 },
];

describe("PayoutWaterfall", () => {
  it("renders classes in priority order with the user class highlighted", async () => {
    fetchMock.mockResolvedValueOnce(
      respond({
        status: "settled",
        amount_received: 100,
        user_class_id: "junior",
        classes: [{ ...classes[0] }, { ...classes[1] }],
      })
    );
    renderWaterfall();

    expect(await screen.findByTestId("payout-waterfall")).toBeInTheDocument();
    const ids = screen
      .getAllByTestId(/payout-class-/)
      .map((node) => node.getAttribute("data-testid"))
      .filter((value) => value?.startsWith("payout-class-") && !value.includes("-paid-"));
    expect(ids).toEqual(["payout-class-senior", "payout-class-junior"]);
    expect(screen.getByTestId("payout-class-junior")).toHaveAttribute("data-user-class", "true");
    expect(screen.getByTestId("payout-waterfall-summary")).toHaveTextContent(
      "Lower-priority classes received nothing"
    );
  });

  it("shows a pending state and missing data state", async () => {
    fetchMock.mockResolvedValueOnce(
      respond({ status: "pending", amount_received: 0, classes: [] })
    );
    const { unmount } = renderWaterfall();
    expect(await screen.findByTestId("payout-waterfall-pending")).toHaveTextContent("pending");

    unmount();
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) });
    renderWaterfall();
    expect(await screen.findByTestId("payout-waterfall-unavailable")).toBeInTheDocument();
  });

  it("flags allocations that do not sum to the amount received", async () => {
    fetchMock.mockResolvedValueOnce(
      respond({ status: "settled", amount_received: 90, classes })
    );
    renderWaterfall();

    expect(await screen.findByTestId("payout-waterfall-mismatch")).toBeInTheDocument();
  });
});
