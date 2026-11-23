import { describe, expect, it } from "vitest";
import { escapeErrorMessage, formatCountdown, msUntil } from "@/lib/escape";

describe("escape helpers (#592)", () => {
  it("maps contract errors to readable messages", () => {
    expect(escapeErrorMessage(new Error("HostError: Error(Contract, #2)"))).toBe(
      "This position has already been withdrawn.",
    );
    expect(escapeErrorMessage(new Error("EscapeNotEnabled"))).toMatch(/not open yet/);
    expect(escapeErrorMessage(new Error("NothingToWithdraw"))).toMatch(/no principal left/);
    expect(escapeErrorMessage(new Error("Gateway timeout"))).toBe("Gateway timeout");
    expect(escapeErrorMessage(undefined)).toMatch(/could not be completed/);
  });

  it("formats a countdown", () => {
    expect(formatCountdown(((2 * 24 + 3) * 3600 + 14 * 60 + 9) * 1000)).toBe("2d 03h 14m 09s");
    expect(formatCountdown(65_000)).toBe("00h 01m 05s");
    expect(formatCountdown(-5)).toBe("00h 00m 00s");
  });

  it("never returns a negative remaining time", () => {
    const now = Date.parse("2026-01-01T00:00:00Z");
    expect(msUntil("2026-01-01T00:00:10Z", now)).toBe(10_000);
    expect(msUntil("2025-12-31T00:00:00Z", now)).toBe(0);
    expect(msUntil(null, now)).toBe(0);
  });
});
