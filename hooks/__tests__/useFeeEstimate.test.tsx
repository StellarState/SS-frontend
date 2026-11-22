import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useFeeEstimate } from "@/hooks/useFeeEstimate";
import { BASE_NETWORK_FEE_XLM } from "@/lib/feeEstimate";

describe("useFeeEstimate (#654)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("debounces amount changes into a single simulation", async () => {
    const simulate = vi.fn().mockResolvedValue(0.002);
    const txBuilder = { simulate };
    const { result, rerender } = renderHook(
      ({ amount }) =>
        useFeeEstimate({ txBuilder, amount, platformFee: 1, xlmBalance: 100, debounceMs: 400 }),
      { initialProps: { amount: 10 } },
    );

    act(() => void vi.advanceTimersByTime(399));
    expect(simulate).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });
    expect(simulate).toHaveBeenCalledTimes(1);
    expect(result.current.networkFee).toBe(0.002);
    expect(result.current.total).toBeCloseTo(11.002);
    expect(result.current.loading).toBe(false);

    rerender({ amount: 20 });
    await act(async () => {
      vi.advanceTimersByTime(400);
      await Promise.resolve();
    });
    expect(simulate).toHaveBeenCalledTimes(2);
    expect(result.current.total).toBeCloseTo(21.002);
  });

  it("falls back to the base fee when simulation fails and does not block signing", async () => {
    const txBuilder = { simulate: vi.fn().mockRejectedValue(new Error("RPC down")) };
    const { result } = renderHook(() =>
      useFeeEstimate({ txBuilder, amount: 10, platformFee: 0, xlmBalance: 50, debounceMs: 0 }),
    );

    await act(async () => {
      vi.advanceTimersByTime(0);
      await Promise.resolve();
    });

    expect(result.current.networkFee).toBe(BASE_NETWORK_FEE_XLM);
    expect(result.current.usedFallback).toBe(true);
    expect(result.current.insufficientBalance).toBe(false);
  });

  it("blocks when the balance cannot cover amount, fees and reserve", async () => {
    const txBuilder = { simulate: vi.fn().mockResolvedValue(0.01) };
    const { result } = renderHook(() =>
      useFeeEstimate({ txBuilder, amount: 10, platformFee: 1, xlmBalance: 5, debounceMs: 0 }),
    );

    await act(async () => {
      vi.advanceTimersByTime(0);
      await Promise.resolve();
    });

    expect(result.current.insufficientBalance).toBe(true);
    expect(result.current.reason).toContain("Insufficient XLM");
  });

  it("does not block when the balance is still unknown", async () => {
    const { result } = renderHook(() =>
      useFeeEstimate({ txBuilder: null, amount: 10, platformFee: 1, xlmBalance: null, debounceMs: 0 }),
    );

    await act(async () => {
      vi.advanceTimersByTime(0);
      await Promise.resolve();
    });

    expect(result.current.usedFallback).toBe(true);
    expect(result.current.insufficientBalance).toBe(false);
  });
});
