import { describe, it, expect } from "vitest";
import type { Invoice } from "@/lib/api";
import {
  cycleSort,
  DEFAULT_SORT_STATE,
  parseSortState,
  serializeSortState,
  sortInvoices,
} from "../invoice-sort";

const invoice = (overrides: Partial<Invoice>): Invoice => ({
  id: "1",
  title: "Invoice",
  seller: "seller",
  amount: 1000,
  raised: 500,
  investor_count: 2,
  status: "open",
  due_date: "2026-08-01T00:00:00Z",
  has_more: false,
  next_cursor: null,
  ...overrides,
});

describe("cycleSort", () => {
  it("starts ascending when clicking an inactive column", () => {
    expect(cycleSort(DEFAULT_SORT_STATE, "faceValue")).toEqual({
      key: "faceValue",
      order: "asc",
    });
  });

  it("moves from ascending to descending on a second click", () => {
    expect(
      cycleSort({ key: "faceValue", order: "asc" }, "faceValue")
    ).toEqual({ key: "faceValue", order: "desc" });
  });

  it("resets to default on a third click", () => {
    expect(
      cycleSort({ key: "faceValue", order: "desc" }, "faceValue")
    ).toEqual(DEFAULT_SORT_STATE);
  });

  it("resets an active sort when a different column is clicked", () => {
    const next = cycleSort({ key: "deadline", order: "desc" }, "faceValue");
    expect(next).toEqual({ key: "faceValue", order: "asc" });
  });
});

describe("sortInvoices", () => {
  const invoices = [
    invoice({ id: "a", amount: 300, due_date: "2026-08-10T00:00:00Z" }),
    invoice({ id: "b", amount: 100, due_date: "2026-08-01T00:00:00Z" }),
    invoice({ id: "c", amount: 200, due_date: "2026-08-05T00:00:00Z" }),
  ];

  it("returns the input unchanged when no sort is active", () => {
    expect(sortInvoices(invoices, DEFAULT_SORT_STATE)).toBe(invoices);
  });

  it("sorts by face value ascending", () => {
    const sorted = sortInvoices(invoices, { key: "faceValue", order: "asc" });
    expect(sorted.map((i) => i.id)).toEqual(["b", "c", "a"]);
  });

  it("sorts by face value descending", () => {
    const sorted = sortInvoices(invoices, { key: "faceValue", order: "desc" });
    expect(sorted.map((i) => i.id)).toEqual(["a", "c", "b"]);
  });

  it("sorts by deadline ascending (soonest first)", () => {
    const sorted = sortInvoices(invoices, { key: "deadline", order: "asc" });
    expect(sorted.map((i) => i.id)).toEqual(["b", "c", "a"]);
  });

  it("sorts by deadline descending", () => {
    const sorted = sortInvoices(invoices, { key: "deadline", order: "desc" });
    expect(sorted.map((i) => i.id)).toEqual(["a", "c", "b"]);
  });

  it("does not mutate the input array", () => {
    const input = [...invoices];
    sortInvoices(invoices, { key: "faceValue", order: "desc" });
    expect(invoices).toEqual(input);
  });
});

describe("parseSortState", () => {
  it("returns the default state when no sort param exists", () => {
    expect(parseSortState(new URLSearchParams(""))).toEqual(
      DEFAULT_SORT_STATE
    );
  });

  it("parses a valid sort and order", () => {
    expect(
      parseSortState(new URLSearchParams("sort=deadline&order=desc"))
    ).toEqual({ key: "deadline", order: "desc" });
  });

  it("defaults order to ascending when missing", () => {
    expect(parseSortState(new URLSearchParams("sort=faceValue"))).toEqual({
      key: "faceValue",
      order: "asc",
    });
  });

  it("ignores invalid sort keys", () => {
    expect(parseSortState(new URLSearchParams("sort=title&order=asc"))).toEqual(
      DEFAULT_SORT_STATE
    );
  });
});

describe("serializeSortState", () => {
  it("sets sort and order params for an active sort", () => {
    const params = serializeSortState(
      { key: "faceValue", order: "desc" },
      new URLSearchParams("")
    );
    expect(params.get("sort")).toBe("faceValue");
    expect(params.get("order")).toBe("desc");
  });

  it("removes sort params when reset", () => {
    const params = serializeSortState(
      DEFAULT_SORT_STATE,
      new URLSearchParams("sort=faceValue&order=asc")
    );
    expect(params.has("sort")).toBe(false);
    expect(params.has("order")).toBe(false);
  });

  it("preserves unrelated query params", () => {
    const params = serializeSortState(
      { key: "deadline", order: "asc" },
      new URLSearchParams("status=open")
    );
    expect(params.get("status")).toBe("open");
    expect(params.get("sort")).toBe("deadline");
  });
});
