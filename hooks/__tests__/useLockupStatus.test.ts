import { describe, expect, it } from "vitest";
import { getLockupStatus } from "../useLockupStatus";

const NOW = Date.parse("2026-11-23T12:00:00.000Z");

describe("getLockupStatus", () => {
  it("rounds remaining lock-up days up to the next whole day", () => {
    expect(getLockupStatus("2026-11-25T00:00:00.000Z", NOW)).toEqual({
      locked: true,
      daysRemaining: 2,
      countdown: null,
    });
  });

  it("switches to an hours-and-minutes countdown during the final 24 hours", () => {
    expect(getLockupStatus("2026-11-24T11:30:00.000Z", NOW)).toEqual({
      locked: true,
      daysRemaining: 1,
      countdown: "Unlocks in 23h 30m",
    });
  });

  it("removes the lock-up once the expiry timestamp has passed", () => {
    expect(getLockupStatus("2026-11-23T11:59:59.000Z", NOW)).toEqual({
      locked: false,
      daysRemaining: 0,
      countdown: null,
    });
  });
});
