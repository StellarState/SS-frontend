import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  useBuyResaleListingMutation,
  useCancelResaleListingMutation,
  useCreateResaleListingMutation,
  useResaleListings,
  resaleListingsQueryKey,
} from "../useResaleListings";

vi.mock("@/lib/api", () => ({
  fetchResaleListings: vi.fn(),
  createResaleListing: vi.fn(),
  cancelResaleListing: vi.fn(),
  buyResaleListing: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import {
  buyResaleListing,
  cancelResaleListing,
  createResaleListing,
  fetchResaleListings,
} from "@/lib/api";
import { toast } from "sonner";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { Wrapper, queryClient };
}

describe("useResaleListings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches listings for the given invoice", async () => {
    vi.mocked(fetchResaleListings).mockResolvedValue([
      {
        id: "listing-1",
        invoice_id: "inv-1",
        invoice_title: "Acme receivable",
        seller: "GSELLER",
        shares_offered: 5,
        price_per_share: 2,
        total_value: 10,
        listed_at: "2026-09-01T00:00:00.000Z",
        status: "active",
      },
    ]);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useResaleListings("inv-1"), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(fetchResaleListings).toHaveBeenCalledWith("inv-1");
  });
});

describe("useCreateResaleListingMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invalidates the listings query and toasts on success", async () => {
    vi.mocked(createResaleListing).mockResolvedValue({
      id: "listing-2",
      invoice_id: "inv-1",
      invoice_title: "Acme receivable",
      seller: "GSELLER",
      shares_offered: 3,
      price_per_share: 4,
      total_value: 12,
      listed_at: "2026-09-01T00:00:00.000Z",
      status: "active",
    });

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useCreateResaleListingMutation(), {
      wrapper: Wrapper,
    });

    result.current.mutate({ invoiceId: "inv-1", shares: 3, pricePerShare: 4 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(createResaleListing).toHaveBeenCalledWith("inv-1", 3, 4);
    expect(toast.success).toHaveBeenCalledWith("Listing created successfully");
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: resaleListingsQueryKey("inv-1"),
    });
  });

  it("toasts an error and does not throw when creation fails", async () => {
    vi.mocked(createResaleListing).mockRejectedValue(new Error("failed"));

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateResaleListingMutation(), {
      wrapper: Wrapper,
    });

    result.current.mutate({ invoiceId: "inv-1", shares: 3, pricePerShare: 4 });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith("Failed to create listing");
  });
});

describe("useCancelResaleListingMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls cancelResaleListing with the invoice and listing ids", async () => {
    vi.mocked(cancelResaleListing).mockResolvedValue({ success: true });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCancelResaleListingMutation(), {
      wrapper: Wrapper,
    });

    result.current.mutate({ invoiceId: "inv-1", listingId: "listing-2" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(cancelResaleListing).toHaveBeenCalledWith("inv-1", "listing-2");
    expect(toast.success).toHaveBeenCalledWith("Listing cancelled");
  });
});

describe("useBuyResaleListingMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls buyResaleListing and invalidates the portfolio query on success", async () => {
    vi.mocked(buyResaleListing).mockResolvedValue({ success: true });

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useBuyResaleListingMutation(), {
      wrapper: Wrapper,
    });

    result.current.mutate({ invoiceId: "inv-1", listingId: "listing-2" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(buyResaleListing).toHaveBeenCalledWith("inv-1", "listing-2");
    expect(toast.success).toHaveBeenCalledWith("Shares purchased successfully");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["portfolio"] });
  });
});
