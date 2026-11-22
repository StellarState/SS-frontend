import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPaymentInstructions } from "@/lib/api/paymentInstructions";

function respond(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

const VALID = {
  amount_due: 100,
  late_interest: 2.5,
  destination: "GDESTINATION",
  memo: "INV-1042",
  due_at: "2026-11-20T00:00:00Z",
  stages: { received: true, matched: false, settled: false },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchPaymentInstructions (#608)", () => {
  it("normalizes a valid token payload", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respond(200, VALID)));
    const result = await fetchPaymentInstructions("tok_abc");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.instructions).toEqual({
      amountDue: 100,
      lateInterest: 2.5,
      destination: "GDESTINATION",
      memo: "INV-1042",
      dueAt: "2026-11-20T00:00:00Z",
      stages: { received: true, matched: false, settled: false },
    });
  });

  it("reports expired and invalid tokens", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respond(410, {})));
    expect(await fetchPaymentInstructions("tok_expired")).toEqual({
      ok: false,
      failure: "expired",
    });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respond(404, {})));
    expect(await fetchPaymentInstructions("tok_missing")).toEqual({
      ok: false,
      failure: "invalid",
    });
  });

  it("rejects payloads without a destination or memo", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(respond(200, { ...VALID, memo: "" }))
    );
    expect(await fetchPaymentInstructions("tok_abc")).toEqual({
      ok: false,
      failure: "invalid",
    });
  });

  it("degrades to unavailable when the service fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await fetchPaymentInstructions("tok_abc")).toEqual({
      ok: false,
      failure: "unavailable",
    });
  });

  it("treats an empty token as invalid without calling the service", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchPaymentInstructions("")).toEqual({ ok: false, failure: "invalid" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
