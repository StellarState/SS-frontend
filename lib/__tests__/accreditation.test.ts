import { describe, expect, it } from "vitest";
import { isAccreditationExpired } from "@/lib/accreditation";

describe("isAccreditationExpired", () => {
  const now = Date.parse("2026-05-01T00:00:00.000Z");

  it("treats the expiry instant as expired", () => {
    expect(isAccreditationExpired("2026-05-01T00:00:00.000Z", now)).toBe(true);
  });

  it("keeps future, absent, and malformed expiry values non-expired", () => {
    expect(isAccreditationExpired("2026-05-02T00:00:00.000Z", now)).toBe(false);
    expect(isAccreditationExpired(null, now)).toBe(false);
    expect(isAccreditationExpired("invalid", now)).toBe(false);
  });
});
