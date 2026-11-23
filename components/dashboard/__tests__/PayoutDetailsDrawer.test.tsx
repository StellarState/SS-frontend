import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { PayoutDetailsDrawer } from "../PayoutDetailsDrawer";
import type { PayoutRecord } from "@/lib/api";

const payout: PayoutRecord = {
  invoiceId: "inv-1",
  sellerName: "Acme Ltd",
  amountInvested: 100,
  amountReceived: 109,
  yield: 10,
  settledAt: "2026-11-20T00:00:00.000Z",
};

function respond(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

function renderDrawer(rate: number) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  render(
    <PayoutDetailsDrawer payout={payout} open onOpenChange={() => {}} />,
    { wrapper }
  );
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PayoutDetailsDrawer", () => {
  it("hides the withholding section for a zero rate", async () => {
    fetchMock.mockResolvedValueOnce(respond({ rate_percentage: 0, recipient_label: "Treasury" }));
    renderDrawer(0);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId("withholding-breakdown")).not.toBeInTheDocument();
  });

  it("shows the rate recipient and seven-decimal values for a partial rate", async () => {
    fetchMock.mockResolvedValueOnce(respond({ rate_percentage: 10, recipient_label: "Treasury" }));
    renderDrawer(10);

    const summary = await screen.findByTestId("withholding-settings-summary");
    expect(summary).toHaveTextContent("Treasury");
    expect(screen.getByTestId("withholding-withheld")).toHaveTextContent("1.0000000");
    expect(screen.getByTestId("withholding-net")).toHaveTextContent("109.0000000");
  });

  it("handles the maximum rate", async () => {
    fetchMock.mockResolvedValueOnce(respond({ rate_percentage: 100, recipient_label: "Treasury" }));
    renderDrawer(100);

    expect(await screen.findByTestId("withholding-breakdown")).toBeInTheDocument();
    expect(screen.getByTestId("withholding-withheld")).toHaveTextContent("10.0000000");
  });
});
