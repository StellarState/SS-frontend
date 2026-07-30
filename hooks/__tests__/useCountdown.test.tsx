import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCountdown } from "../useCountdown";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useCountdown", () => {
  it("returns correct days, hours, minutes for a future deadline", () => {
    const now = new Date("2024-01-01T00:00:00.000Z").getTime();
    const deadline = new Date("2024-01-03T03:30:00.000Z").toISOString(); // 2 days, 3 hours, 30 minutes from now

    vi.spyOn(Date, "now").mockReturnValue(now);

    const { result } = renderHook(() => useCountdown(deadline, true));

    expect(result.current).toEqual({ days: 2, hours: 3, minutes: 30 });
  });

  it("returns zeros when deadline is exactly 0 seconds from now", () => {
    const now = new Date("2024-01-01T00:00:00.000Z").getTime();
    const deadline = new Date("2024-01-01T00:00:00.000Z").toISOString();

    vi.spyOn(Date, "now").mockReturnValue(now);

    const { result } = renderHook(() => useCountdown(deadline, true));

    expect(result.current).toEqual({ days: 0, hours: 0, minutes: 0 });
  });

  it("returns zeros when deadline is in the past (no negative values)", () => {
    const now = new Date("2024-01-02T00:00:00.000Z").getTime();
    const deadline = new Date("2024-01-01T00:00:00.000Z").toISOString(); // 1 day in the past

    vi.spyOn(Date, "now").mockReturnValue(now);

    const { result } = renderHook(() => useCountdown(deadline, true));

    expect(result.current).toEqual({ days: 0, hours: 0, minutes: 0 });
  });

  it("returns zeros when published is false", () => {
    const deadline = new Date("2024-01-03T00:00:00.000Z").toISOString();

    const { result } = renderHook(() => useCountdown(deadline, false));

    expect(result.current).toEqual({ days: 0, hours: 0, minutes: 0 });
  });

  it("returns zeros when deadline is null", () => {
    const { result } = renderHook(() => useCountdown(null, true));

    expect(result.current).toEqual({ days: 0, hours: 0, minutes: 0 });
  });

  it("updates output after a simulated 1-minute tick", () => {
    const now = new Date("2024-01-01T00:00:00.000Z").getTime();
    const deadline = new Date("2024-01-01T01:01:00.000Z").toISOString(); // 1 hour, 1 minute from now

    vi.spyOn(Date, "now").mockReturnValue(now);

    const { result, rerender } = renderHook(() => useCountdown(deadline, true));

    expect(result.current).toEqual({ days: 0, hours: 1, minutes: 1 });

    // Simulate 1 minute passing
    const oneMinuteLater = new Date("2024-01-01T00:01:00.000Z").getTime();
    vi.spyOn(Date, "now").mockReturnValue(oneMinuteLater);

    rerender();

    expect(result.current).toEqual({ days: 0, hours: 1, minutes: 0 });
  });

  it("clears interval on unmount (no memory leak)", () => {
    const clearIntervalSpy = vi.spyOn(clearInterval);
    const setIntervalSpy = vi.spyOn(setInterval).mockReturnValue(123 as any);

    const deadline = new Date("2024-01-03T00:00:00.000Z").toISOString();

    const { unmount } = renderHook(() => useCountdown(deadline, true));

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    expect(clearIntervalSpy).not.toHaveBeenCalled();

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    expect(clearIntervalSpy).toHaveBeenCalledWith(123);
  });

  it("does not set interval when deadline is null", () => {
    const setIntervalSpy = vi.spyOn(setInterval);

    const { unmount } = renderHook(() => useCountdown(null, true));

    expect(setIntervalSpy).not.toHaveBeenCalled();

    unmount();
  });

  it("does not set interval when published is false", () => {
    const setIntervalSpy = vi.spyOn(setInterval);
    const deadline = new Date("2024-01-03T00:00:00.000Z").toISOString();

    const { unmount } = renderHook(() => useCountdown(deadline, false));

    expect(setIntervalSpy).not.toHaveBeenCalled();

    unmount();
  });
});
