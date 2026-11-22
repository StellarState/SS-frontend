import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import MarketplacePage from "../page";
import { useInfiniteQuery } from "@tanstack/react-query";

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
  return { ...actual, useInfiniteQuery: vi.fn() };
});

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/marketplace",
}));

const mockUseInfiniteQuery = vi.mocked(useInfiniteQuery);

function invoice(id: string, title: string, attestation_summary?: unknown) {
  return {
    id,
    title,
    seller: "seller",
    amount: 1000,
    raised: 0,
    investor_count: 0,
    status: "open",
    due_date: "2026-12-01T00:00:00Z",
    has_more: false,
    next_cursor: null,
    attestation_summary,
  };
}

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseInfiniteQuery.mockReturnValue({
    data: {
      pages: [
        {
          invoices: [
            invoice("1", "Verified Invoice", { verified: 1, total: 1, invalidated: 0 }),
            invoice("2", "Unreviewed Invoice"),
          ],
          has_more: false,
          next_cursor: null,
        },
      ],
    },
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
    isFetching: false,
  } as any);
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("marketplace verified-attestation filter (#605)", () => {
  it("shows only invoices with a verified attestation", () => {
    render(<MarketplacePage />, { wrapper: createWrapper() });

    expect(screen.getByText("Verified Invoice")).toBeInTheDocument();
    expect(screen.getByText("Unreviewed Invoice")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("filter-verified-attestation"));

    expect(screen.getByText("Verified Invoice")).toBeInTheDocument();
    expect(screen.queryByText("Unreviewed Invoice")).not.toBeInTheDocument();
    expect(mockReplace).toHaveBeenCalledWith("/marketplace?verifiedAttestation=true", {
      scroll: false,
    });
  });
});
