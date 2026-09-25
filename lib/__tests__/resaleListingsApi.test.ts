import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  buyResaleListing,
  cancelResaleListing,
  createResaleListing,
  fetchResaleListings,
} from "@/lib/api";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body } as unknown as Response;
}

describe("fetchResaleListings", () => {
  it("fetches listings for the given invoice", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([
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
      ])
    );

    const result = await fetchResaleListings("inv-1");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/invoices/inv-1/resale-listings")
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("listing-1");
  });

  it("throws when the response is not ok", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false));

    await expect(fetchResaleListings("inv-1")).rejects.toThrow(
      "Failed to fetch resale listings"
    );
  });
});

describe("createResaleListing", () => {
  it("posts shares and price per share", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: "listing-2" }));

    await createResaleListing("inv-1", 3, 2.5);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/invoices/inv-1/resale-listings"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ shares: 3, price_per_share: 2.5 }),
      })
    );
  });

  it("throws when creation fails", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false));

    await expect(createResaleListing("inv-1", 3, 2.5)).rejects.toThrow(
      "Failed to create resale listing"
    );
  });
});

describe("cancelResaleListing", () => {
  it("posts to the cancel endpoint for the given listing", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true }));

    await cancelResaleListing("inv-1", "listing-2");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/invoices/inv-1/resale-listings/listing-2/cancel"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("throws when cancellation fails", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false));

    await expect(cancelResaleListing("inv-1", "listing-2")).rejects.toThrow(
      "Failed to cancel resale listing"
    );
  });
});

describe("buyResaleListing", () => {
  it("posts to the buy endpoint for the given listing", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true }));

    await buyResaleListing("inv-1", "listing-2");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/invoices/inv-1/resale-listings/listing-2/buy"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("throws when the purchase fails", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false));

    await expect(buyResaleListing("inv-1", "listing-2")).rejects.toThrow(
      "Failed to buy resale listing"
    );
  });
});
