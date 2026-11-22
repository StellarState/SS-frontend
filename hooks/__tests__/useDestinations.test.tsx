import { describe, expect, it, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { useDestinations } from "../useDestinations";
import { DESTINATIONS_STORAGE_KEY } from "@/lib/destinations";

const VALID = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
const OTHER = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHFAAAA";

describe("useDestinations", () => {
  beforeEach(() => localStorage.clear());

  it("starts empty and persists an added destination as unconfirmed", async () => {
    const { result } = renderHook(() => useDestinations());
    await waitFor(() => expect(result.current.isReady).toBe(true));

    act(() => {
      result.current.addDestination({ label: "Bank", address: VALID, requiresMemo: false });
    });

    expect(result.current.destinations).toHaveLength(1);
    expect(result.current.destinations[0].confirmed).toBe(false);
    expect(JSON.parse(localStorage.getItem(DESTINATIONS_STORAGE_KEY)!)).toHaveLength(1);
  });

  it("edits, confirms and deletes immutably", async () => {
    const { result } = renderHook(() => useDestinations());
    await waitFor(() => expect(result.current.isReady).toBe(true));
    act(() => {
      result.current.addDestination({ label: "Bank", address: VALID, requiresMemo: false });
    });
    const id = result.current.destinations[0].id;

    act(() => result.current.editDestination(id, { label: "Main bank", address: OTHER }));
    expect(result.current.destinations[0].label).toBe("Main bank");

    act(() => result.current.confirmDestination(id));
    expect(result.current.destinations[0].confirmed).toBe(true);

    act(() => result.current.removeDestination(id));
    expect(result.current.destinations).toEqual([]);
  });

  it("recovers from corrupt storage", async () => {
    localStorage.setItem(DESTINATIONS_STORAGE_KEY, "{bad json");
    const { result } = renderHook(() => useDestinations());
    await waitFor(() => expect(result.current.destinations).toEqual([]));
  });

  it("syncs deletions from another tab", async () => {
    localStorage.setItem(
      DESTINATIONS_STORAGE_KEY,
      JSON.stringify([
        {
          id: "d1",
          label: "Bank",
          address: VALID,
          requiresMemo: false,
          confirmed: true,
          createdAt: new Date().toISOString(),
        },
      ]),
    );
    const { result } = renderHook(() => useDestinations());
    await waitFor(() => expect(result.current.destinations).toHaveLength(1));

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: DESTINATIONS_STORAGE_KEY, newValue: "[]" }),
      );
    });
    await waitFor(() => expect(result.current.destinations).toEqual([]));
  });
});
