import { cloneElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FundingDepth } from "@/components/marketplace/FundingDepth";
import { FUNDING_DEPTH_POLL_INTERVAL_MS } from "@/hooks/useInvoiceFundingDepth";

vi.mock("@/lib/api", async (original) => ({
  ...(await original<typeof import("@/lib/api")>()),
  fetchInvoiceFundingDepth: vi.fn(),
}));
vi.mock("recharts", async (original) => {
  const actual = await original<typeof import("recharts")>();
  return { ...actual, ResponsiveContainer: ({ children }: { children: React.ReactElement }) => cloneElement(children, { width: 400, height: 240 } as object) };
});
import { fetchInvoiceFundingDepth } from "@/lib/api";

function renderDepth(compact = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><FundingDepth invoiceId="invoice-1" compact={compact} /></QueryClientProvider>);
}

describe("FundingDepth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("refreshes every 30 seconds and renders live levels with estimated fill times", async () => {
    vi.mocked(fetchInvoiceFundingDepth).mockResolvedValue({
      live: true, updatedAt: new Date().toISOString(),
      levels: [{ committed: 500, estimatedHours: 3 }, { committed: 1000, estimatedHours: 8 }],
    });
    renderDepth();
    expect(await screen.findByTestId("funding-depth-card")).toBeInTheDocument();
    expect(screen.getByText("500 XLM")).toBeInTheDocument();
    expect(screen.getByText("8 hours")).toBeInTheDocument();
    expect(FUNDING_DEPTH_POLL_INTERVAL_MS).toBe(30_000);
  });

  it("shows a compact funding summary for marketplace cards", async () => {
    vi.mocked(fetchInvoiceFundingDepth).mockResolvedValue({ live: true, updatedAt: new Date().toISOString(), levels: [{ committed: 250, estimatedHours: 1 }] });
    renderDepth(true);
    expect(await screen.findByTestId("funding-depth-compact-invoice-1")).toHaveTextContent("250 XLM");
  });

  it("marks old snapshots with their last update time", async () => {
    vi.mocked(fetchInvoiceFundingDepth).mockResolvedValue({
      live: true, updatedAt: "2020-01-01T12:00:00Z", levels: [{ committed: 250, estimatedHours: null }],
    });
    renderDepth();
    expect(await screen.findByRole("status")).toHaveTextContent("Stale data · Last updated");
  });

  it("hides when no live book is available", async () => {
    vi.mocked(fetchInvoiceFundingDepth).mockResolvedValue(null);
    renderDepth();
    await vi.waitFor(() => expect(fetchInvoiceFundingDepth).toHaveBeenCalled());
    expect(screen.queryByTestId("funding-depth-card")).not.toBeInTheDocument();
  });
});
