import { describe, expect, it } from "vitest";
import {
  buildPaymentUri,
  classifyTokenFailure,
  formatPaymentAmount,
  totalDue,
} from "@/lib/paymentUri";

describe("payment instructions (#608)", () => {
  it("formats displayed amounts to seven decimals", () => {
    expect(formatPaymentAmount(12.5)).toBe("12.5000000");
    expect(formatPaymentAmount(1234.5)).toContain(",");
    expect(formatPaymentAmount(Number.NaN)).toBe("0.0000000");
  });

  it("encodes a memo-bearing URI without thousands separators", () => {
    const uri = buildPaymentUri("GDESTINATION", 1234.5, "INV-1042");
    const parsed = new URL(uri);

    expect(parsed.protocol).toBe("web+stellar:");
    expect(parsed.searchParams.get("destination")).toBe("GDESTINATION");
    expect(parsed.searchParams.get("amount")).toBe("1234.5000000");
    expect(parsed.searchParams.get("memo")).toBe("INV-1042");
    expect(parsed.searchParams.get("amount")).not.toContain(",");
  });

  it("falls back to zero for a non-finite amount", () => {
    const parsed = new URL(buildPaymentUri("GDESTINATION", Number.NaN, "MEMO"));
    expect(parsed.searchParams.get("amount")).toBe("0.0000000");
  });

  it("adds late interest to the amount due", () => {
    expect(totalDue(100, 2.5)).toBe(102.5);
    expect(totalDue(Number.NaN, 2)).toBe(2);
    expect(totalDue(100, -500)).toBe(0);
  });

  it("classifies invalid, expired and unavailable tokens", () => {
    expect(classifyTokenFailure(404, {})).toBe("invalid");
    expect(classifyTokenFailure(410, {})).toBe("expired");
    expect(classifyTokenFailure(400, { code: "token_expired" })).toBe("expired");
    expect(classifyTokenFailure(400, { error: "invalid token" })).toBe("invalid");
    expect(classifyTokenFailure(503, {})).toBe("unavailable");
  });
});
