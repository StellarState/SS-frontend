import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useAgreement,
  CURRENT_TERMS_VERSION,
  STORAGE_KEY_AGREEMENTS,
} from "@/hooks/useAgreement";

describe("useAgreement Hook (Issue #760)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("initializes with unaccepted state when storage is empty", () => {
    const { result } = renderHook(() => useAgreement());

    expect(result.current.currentVersion).toBe(CURRENT_TERMS_VERSION);
    expect(result.current.hasAcceptedCurrentVersion).toBe(false);
    expect(result.current.isInvestingBlocked).toBe(true);
    expect(result.current.investingBlockReason).toContain(CURRENT_TERMS_VERSION);
    expect(result.current.acceptedAgreements).toEqual([]);
  });

  it("records acceptance with version, timestamp and confirmationId", () => {
    const { result } = renderHook(() => useAgreement());

    let record: any;
    act(() => {
      record = result.current.acceptAgreement();
    });

    expect(record.version).toBe(CURRENT_TERMS_VERSION);
    expect(record.confirmationId).toMatch(/^AGR-/);
    expect(record.acceptedAt).toBeDefined();

    expect(result.current.hasAcceptedCurrentVersion).toBe(true);
    expect(result.current.isInvestingBlocked).toBe(false);
    expect(result.current.investingBlockReason).toBeNull();
    expect(result.current.acceptedAgreements.length).toBe(1);

    // Verify localStorage persistence
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY_AGREEMENTS) || "[]");
    expect(stored.length).toBe(1);
    expect(stored[0].version).toBe(CURRENT_TERMS_VERSION);
  });

  it("re-prompts and blocks investing when terms version changes", () => {
    // User had previously accepted v2.0.0
    const previousAcceptance = [
      {
        version: "2.0.0",
        acceptedAt: "2026-01-01T00:00:00.000Z",
        termsTitle: "Old Terms",
        confirmationId: "AGR-OLD-1",
      },
    ];
    localStorage.setItem(STORAGE_KEY_AGREEMENTS, JSON.stringify(previousAcceptance));

    // Platform is now at CURRENT_TERMS_VERSION (2.1.0)
    const { result } = renderHook(() => useAgreement());

    expect(result.current.hasAcceptedCurrentVersion).toBe(false);
    expect(result.current.isInvestingBlocked).toBe(true);
    expect(result.current.investingBlockReason).toContain("2.1.0");
    expect(result.current.latestAcceptedVersion).toBe("2.0.0");

    // Accepting the new version unblocks investing
    act(() => {
      result.current.acceptAgreement("2.1.0");
    });

    expect(result.current.hasAcceptedCurrentVersion).toBe(true);
    expect(result.current.isInvestingBlocked).toBe(false);
    expect(result.current.acceptedAgreements.length).toBe(2);
  });

  it("handles agreement copy download", () => {
    const { result } = renderHook(() => useAgreement());

    const createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    const revokeObjectURL = vi.fn();
    window.URL.createObjectURL = createObjectURL;
    window.URL.revokeObjectURL = revokeObjectURL;

    act(() => {
      result.current.downloadAgreement(CURRENT_TERMS_VERSION);
    });

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });
});
