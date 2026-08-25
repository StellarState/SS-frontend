import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { SellerDashboard } from "../SellerDashboard";

vi.mock("@/hooks/useSellerDashboard", () => ({
  useSellerDashboard: vi.fn(),
}));

import { useSellerDashboard } from "@/hooks/useSellerDashboard";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function makeDashboardData(invoices: any[]) {
  return {
    total_invoices: invoices.length,
    total_funded: invoices.filter((i) => i.status === "funded").length,
    total_settled: invoices.filter((i) => i.status === "settled").length,
    total_raised: invoices.reduce((sum, i) => sum + i.raised, 0),
    invoices,
  };
}

function makeInvoice(overrides: any = {}) {
  return {
    id: "inv-1",
    title: "Test Invoice",
    seller: "seller-address",
    amount: 10000,
    raised: 5000,
    investor_count: 3,
    status: "open",
    due_date: new Date(Date.now() + 86400000).toISOString(),
    has_more: false,
    next_cursor: null,
    ...overrides,
  };
}

describe("SellerDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading skeleton while data is loading", () => {
    vi.mocked(useSellerDashboard).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    render(<SellerDashboard />, { wrapper: createWrapper() });
    expect(screen.getByTestId("seller-dashboard-loading")).toBeInTheDocument();
  });

  it("shows empty state when no invoices", () => {
    vi.mocked(useSellerDashboard).mockReturnValue({
      data: makeDashboardData([]),
      isLoading: false,
    } as any);

    render(<SellerDashboard />, { wrapper: createWrapper() });
    expect(screen.getByText("You haven't published any invoices yet.")).toBeInTheDocument();
  });

  it("renders stat cards", () => {
    vi.mocked(useSellerDashboard).mockReturnValue({
      data: makeDashboardData([makeInvoice()]),
      isLoading: false,
    } as any);

    render(<SellerDashboard />, { wrapper: createWrapper() });
    expect(screen.getByText("Total Invoices")).toBeInTheDocument();
    expect(screen.getByText("Total Funded")).toBeInTheDocument();
    expect(screen.getByText("Total Settled")).toBeInTheDocument();
    expect(screen.getByText("XLM Raised")).toBeInTheDocument();
  });

  it("shows rejected banner for rejected invoices", () => {
    vi.mocked(useSellerDashboard).mockReturnValue({
      data: makeDashboardData([
        makeInvoice({ status: "rejected", rejection_reason: "Missing documentation" }),
      ]),
      isLoading: false,
    } as any);

    render(<SellerDashboard />, { wrapper: createWrapper() });

    expect(screen.getByTestId("rejected-banner")).toBeInTheDocument();
    expect(screen.getByText(/This invoice was not approved/)).toBeInTheDocument();
    expect(screen.getByText(/Missing documentation/)).toBeInTheDocument();
  });

  it("shows Edit and Resubmit button in rejected banner", () => {
    vi.mocked(useSellerDashboard).mockReturnValue({
      data: makeDashboardData([
        makeInvoice({ id: "inv-abc", status: "rejected", rejection_reason: "Invalid amount" }),
      ]),
      isLoading: false,
    } as any);

    render(<SellerDashboard />, { wrapper: createWrapper() });

    const link = screen.getByRole("link", { name: "Edit and Resubmit" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/seller/publish?edit=inv-abc");
  });

  it("does not show rejected banner for open invoices", () => {
    vi.mocked(useSellerDashboard).mockReturnValue({
      data: makeDashboardData([makeInvoice({ status: "open" })]),
      isLoading: false,
    } as any);

    render(<SellerDashboard />, { wrapper: createWrapper() });
    expect(screen.queryByTestId("rejected-banner")).not.toBeInTheDocument();
  });

  it("does not show rejected banner for settled invoices", () => {
    vi.mocked(useSellerDashboard).mockReturnValue({
      data: makeDashboardData([makeInvoice({ status: "settled" })]),
      isLoading: false,
    } as any);

    render(<SellerDashboard />, { wrapper: createWrapper() });
    expect(screen.queryByTestId("rejected-banner")).not.toBeInTheDocument();
  });

  it("does not show rejected banner for funded invoices", () => {
    vi.mocked(useSellerDashboard).mockReturnValue({
      data: makeDashboardData([makeInvoice({ status: "funded" })]),
      isLoading: false,
    } as any);

    render(<SellerDashboard />, { wrapper: createWrapper() });
    expect(screen.queryByTestId("rejected-banner")).not.toBeInTheDocument();
  });
});
