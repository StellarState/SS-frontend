"use client";

import { useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type CrossTabEvent =
  | { type: "wallet-connect"; account: string; network: string }
  | { type: "wallet-disconnect" }
  | { type: "account-change"; account: string }
  | { type: "network-change"; network: string };

type EventHandler = (event: CrossTabEvent) => void;

const STORAGE_KEY = "ss-cross-tab-sync";
const BROADCAST_CHANNEL_NAME = "stellar-state-sync";
const DEBOUNCE_MS = 100;

export function useCrossTabSync(
  onEvent?: EventHandler,
  options?: {
    invalidateQueries?: string[];
    closeModals?: () => void;
    tabId?: string;
  }
) {
  const queryClient = useQueryClient();
  const broadcastChannel = useRef<BroadcastChannel | null>(null);
  const lastEventTime = useRef<number>(0);
  const tabId = useRef(options?.tabId || Math.random().toString(36).slice(2));

  const broadcast = useCallback((event: CrossTabEvent) => {
    const now = Date.now();
    if (now - lastEventTime.current < DEBOUNCE_MS) return;
    lastEventTime.current = now;

    const payload = { ...event, tabId: tabId.current, timestamp: now };

    if (broadcastChannel.current) {
      try {
        broadcastChannel.current.postMessage(payload);
      } catch (e) {
        console.error("BroadcastChannel error:", e);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      }
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("BroadcastChannel" in window) {
      try {
        broadcastChannel.current = new BroadcastChannel(
          BROADCAST_CHANNEL_NAME
        );
        broadcastChannel.current.onmessage = (e) => {
          if (e.data.tabId === tabId.current) return;

          const event = e.data as CrossTabEvent;
          handleCrossTabEvent(event);
        };
      } catch (e) {
        console.warn("BroadcastChannel not available, using localStorage", e);
      }
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;

      try {
        const event = JSON.parse(e.newValue) as CrossTabEvent & {
          tabId: string;
        };
        if (event.tabId === tabId.current) return;
        handleCrossTabEvent(event);
      } catch (e) {
        console.error("Failed to parse storage event:", e);
      }
    };

    function handleCrossTabEvent(event: CrossTabEvent) {
      onEvent?.(event);

      if (event.type === "account-change") {
        options?.invalidateQueries?.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: [key] });
        });
        options?.closeModals?.();
        toast.info("Account changed in another tab");
      } else if (event.type === "wallet-disconnect") {
        options?.invalidateQueries?.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: [key] });
        });
        options?.closeModals?.();
        toast.info("Wallet disconnected in another tab");
      }
    }

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      broadcastChannel.current?.close();
    };
  }, [onEvent, options?.invalidateQueries, options?.closeModals, queryClient]);

  return { broadcast, tabId: tabId.current };
}
