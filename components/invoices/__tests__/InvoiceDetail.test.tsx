import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { InvoiceDetail } from "../InvoiceDetail";

vi.mock("@/lib/api", () => ({
  fetchInvoiceDetail: vi.fn(),
  fetchProtocolStatus: vi.fn().mockResolvedValue({ min_investment: 1 }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: vi.fn(),
    push: vi.fn(),
  }),
}));

vi.mock("@/lib/recentlyViewed", () => ({
  recordView: vi.fn(),
}));

vi.mock("@/components/marketplace", () => ({
  CountdownTimer: ({ deadline, published }: { deadline: string; published: boolean }) =>
    published ? <span data-testid="countdown">Countdown</span> : null,
  isExpired: (deadline: string) => new Date(deadline).getTime() <= Date.now(),
}));

vi.mock("@/components/invoices/DocumentPreview", () => ({
  DocumentPreview: ({ documentUrl }: { documentUrl: string }) =>
    documentUrl ? <div data-testid="document-preview">Preview</div> : null,
}));

vi.mock("@/lib/logger", () => ({
  logError: vi.fn(),
}));

import { fetchInvoiceDetail, fetchProtocolStatus } from "@/lib/api";

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

function makeInvoice(overrides: Record<string, any> = {}) {
  return {
    id: "inv-1",
    title: "Test Invoice",
    seller: "seller-address",
    amount: 10000,
    raised: 5000,
    investor_count: 3,
    status: "open" as const,
    due_date: new Date(Date.now() + 86400000).toISOString(),
    has_more: false,
    next_cursor: null,
    description: "Test description",
    investors: [],
    document_url: "https://ipfs.example.com/doc.pdf",
    ...overrides,
  };
}

describe("InvoiceDetail - Invest Button Visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows invest button for open (published) invoice that is not expired", async () => {
    vi.mocked(fetchInvoiceDetail).mockResolvedValue(makeInvoice({ status: "open" }));

    render(<InvoiceDetail invoiceId="inv-1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId("invest-button")).toBeInTheDocument();
    });
    expect(screen.getByText("Invest")).toBeInTheDocument();
    expect(screen.queryByTestId("invest-expired-message")).not.toBeInTheDocument();
    expect(screen.queryByTestId("invest-settled-message")).not.toBeInTheDocument();
    expect(screen.queryByTestId("invest-funded-message")).not.toBeInTheDocument();
  });

  it("hides invest button and shows expired message for open invoice past due date", async () => {
    vi.mocked(fetchInvoiceDetail).mockResolvedValue(
      makeInvoice({ status: "open", due_date: new Date("2025-01-01T00:00:00Z").toISOString() })
    );

    render(<InvoiceDetail invoiceId="inv-1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId("invest-expired-message")).toBeInTheDocument();
    });
    expect(screen.getByText("This invoice has expired")).toBeInTheDocument();
    expect(screen.queryByTestId("invest-button")).not.toBeInTheDocument();
  });

  it("hides invest button and shows settled message for settled invoice", async () => {
    vi.mocked(fetchInvoiceDetail).mockResolvedValue(makeInvoice({ status: "settled" }));

    render(<InvoiceDetail invoiceId="inv-1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId("invest-settled-message")).toBeInTheDocument();
    });
    expect(screen.getByText("This invoice has been settled")).toBeInTheDocument();
    expect(screen.queryByTestId("invest-button")).not.toBeInTheDocument();
  });

  it("hides invest button and shows funded message for funded invoice", async () => {
    vi.mocked(fetchInvoiceDetail).mockResolvedValue(makeInvoice({ status: "funded" }));

    render(<InvoiceDetail invoiceId="inv-1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId("invest-funded-message")).toBeInTheDocument();
    });
    expect(screen.getByText("This invoice is fully funded")).toBeInTheDocument();
    expect(screen.queryByTestId("invest-button")).not.toBeInTheDocument();
  });

  it("hides invest button with no message for draft invoice", async () => {
    vi.mocked(fetchInvoiceDetail).mockResolvedValue(makeInvoice({ status: "draft" }));

    render(<InvoiceDetail invoiceId="inv-1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId("invest-section")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("invest-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("invest-expired-message")).not.toBeInTheDocument();
    expect(screen.queryByTestId("invest-settled-message")).not.toBeInTheDocument();
    expect(screen.queryByTestId("invest-funded-message")).not.toBeInTheDocument();
  });

  it("renders invoice title and status badge", async () => {
    vi.mocked(fetchInvoiceDetail).mockResolvedValue(makeInvoice({ title: "My Invoice" }));

    render(<InvoiceDetail invoiceId="inv-1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("My Invoice")).toBeInTheDocument();
    });
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("shows loading skeleton before data loads", () => {
    vi.mocked(fetchInvoiceDetail).mockReturnValue(new Promise(() => {}));
    const { container } = render(<InvoiceDetail invoiceId="inv-1" />, {
      wrapper: createWrapper(),
    });
    expect(container.querySelector("[class*='animate-pulse']")).toBeInTheDocument();
  });
});

describe("InvoiceDetail - minimum investment (issue #116)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes the minimum investment from GET /protocol/status to the invest modal, not a hardcoded value", async () => {
    vi.mocked(fetchInvoiceDetail).mockResolvedValue(makeInvoice({ status: "open" }));
    vi.mocked(fetchProtocolStatus).mockResolvedValue({ min_investment: 250 });

    render(<InvoiceDetail invoiceId="inv-1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId("invest-button")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("invest-button"));

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("250 - 5000")
      ).toBeInTheDocument();
    });
    expect(fetchProtocolStatus).toHaveBeenCalled();
  });

  it("falls back to the previous default while /protocol/status is loading", async () => {
    vi.mocked(fetchInvoiceDetail).mockResolvedValue(makeInvoice({ status: "open" }));
    vi.mocked(fetchProtocolStatus).mockReturnValue(new Promise(() => {}));

    render(<InvoiceDetail invoiceId="inv-1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId("invest-button")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("invest-button"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("1 - 5000")).toBeInTheDocument();
    });
  });
});
