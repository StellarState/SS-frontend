"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DESTINATIONS_STORAGE_KEY,
  addDestination as add,
  parseDestinations,
  removeDestination as remove,
  updateDestination as update,
  type Destination,
  type DestinationInput,
} from "@/lib/destinations";

/**
 * Device-local saved payout destinations (#649) with add/edit/delete/confirm
 * mutations. Persisted to localStorage and synced across tabs.
 */
export function useDestinations() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [isReady, setIsReady] = useState(false);
  const current = useRef<Destination[]>([]);

  const commit = useCallback((next: Destination[]) => {
    current.current = next;
    setDestinations(next);
    try {
      window.localStorage.setItem(DESTINATIONS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage may be unavailable; the list still works for this session.
    }
  }, []);

  useEffect(() => {
    let stored: Destination[] = [];
    try {
      stored = parseDestinations(window.localStorage.getItem(DESTINATIONS_STORAGE_KEY));
    } catch {
      stored = [];
    }
    current.current = stored;
    setDestinations(stored);
    setIsReady(true);

    const onStorage = (event: StorageEvent) => {
      if (event.key !== DESTINATIONS_STORAGE_KEY) return;
      const next = parseDestinations(event.newValue);
      current.current = next;
      setDestinations(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const addDestinationRecord = useCallback(
    (input: DestinationInput) => commit(add(current.current, input)),
    [commit],
  );
  const editDestination = useCallback(
    (id: string, patch: Partial<Destination>) => commit(update(current.current, id, patch)),
    [commit],
  );
  const removeDestinationRecord = useCallback(
    (id: string) => commit(remove(current.current, id)),
    [commit],
  );
  const confirmDestination = useCallback(
    (id: string) => commit(update(current.current, id, { confirmed: true })),
    [commit],
  );

  return {
    destinations,
    isReady,
    addDestination: addDestinationRecord,
    editDestination,
    removeDestination: removeDestinationRecord,
    confirmDestination,
  };
}
