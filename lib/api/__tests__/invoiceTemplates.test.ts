import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteInvoiceTemplate,
  listInvoiceTemplates,
  saveInvoiceTemplate,
} from "@/lib/api/invoiceTemplates";
import { TEMPLATE_STORAGE_KEY } from "@/lib/invoiceTemplates";

const TEMPLATE = {
  id: "tpl-1",
  name: "Client A",
  debtor: "Acme",
  terms: "Net 30",
  description: "Monthly services",
  createdAt: "2026-11-01T00:00:00Z",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  window.localStorage.clear();
});

describe("invoice template persistence (#609)", () => {
  it("falls back to localStorage when the backend is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    expect(await saveInvoiceTemplate(TEMPLATE)).toEqual([TEMPLATE]);
    expect(await listInvoiceTemplates()).toEqual([TEMPLATE]);

    expect(await deleteInvoiceTemplate(TEMPLATE.id)).toEqual([]);
    expect(window.localStorage.getItem(TEMPLATE_STORAGE_KEY)).toBe("[]");
  });

  it("uses backend templates when they are available", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ templates: [TEMPLATE] }),
      })
    );

    expect(await listInvoiceTemplates()).toEqual([TEMPLATE]);
  });

  it("keeps local deletions even when the backend response is stale", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await saveInvoiceTemplate(TEMPLATE);
    await deleteInvoiceTemplate(TEMPLATE.id);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ templates: [TEMPLATE] }),
      })
    );

    expect(await listInvoiceTemplates()).toEqual([]);
  });

  it("ignores malformed stored data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify([{ name: "no id" }]));
    expect(await listInvoiceTemplates()).toEqual([]);
  });
});
