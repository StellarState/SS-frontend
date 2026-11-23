"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  type AllowlistSettings,
  type AddEntryInput,
  type WithdrawalCheckResult,
  DEFAULT_ALLOWLIST_SETTINGS,
  createPendingAllowlistEntry,
  validateWithdrawalDestination,
  evaluateEntryStatus,
  isReauthSessionValid,
} from "@/lib/security/allowlistRules";

export const ALLOWLIST_STORAGE_KEY = "ss-withdrawal-allowlist-settings";

// Demo passkey/passcode validator for testing & user authentication
export function verifyPasscode(passcode: string): boolean {
  return passcode.trim().length >= 4;
}

export function useWithdrawalAllowlist() {
  const [settings, setSettings] = useState<AllowlistSettings>(() => {
    if (typeof window === "undefined") return DEFAULT_ALLOWLIST_SETTINGS;
    try {
      const stored = window.localStorage.getItem(ALLOWLIST_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return DEFAULT_ALLOWLIST_SETTINGS;
  });

  const [reauthTime, setReauthTime] = useState<string | null>(
    settings.lastReauthTimestamp ?? null,
  );

  // Sync to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(ALLOWLIST_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  const isReauthenticated = useMemo(() => {
    return isReauthSessionValid(reauthTime);
  }, [reauthTime]);

  const reauthenticate = useCallback((passcode: string): boolean => {
    if (!verifyPasscode(passcode)) return false;
    const nowIso = new Date().toISOString();
    setReauthTime(nowIso);
    setSettings((prev) => ({ ...prev, lastReauthTimestamp: nowIso }));
    return true;
  }, []);

  const setEnforcement = useCallback(
    (enforced: boolean, passcode?: string): { success: boolean; error?: string } => {
      if (!isReauthenticated && (!passcode || !verifyPasscode(passcode))) {
        return {
          success: false,
          error: "Fresh authentication required to toggle allowlist enforcement.",
        };
      }
      setSettings((prev) => ({ ...prev, enforced }));
      return { success: true };
    },
    [isReauthenticated],
  );

  const addAddress = useCallback(
    (input: AddEntryInput, passcode?: string): { success: boolean; error?: string } => {
      if (!isReauthenticated && (!passcode || !verifyPasscode(passcode))) {
        return {
          success: false,
          error: "Authentication required to add allowlist address.",
        };
      }

      const res = createPendingAllowlistEntry(input, settings);
      if (!res.valid || !res.entry) {
        return { success: false, error: res.error };
      }

      setSettings((prev) => ({
        ...prev,
        entries: [...prev.entries, res.entry!],
      }));
      return { success: true };
    },
    [isReauthenticated, settings],
  );

  const cancelPending = useCallback((id: string) => {
    setSettings((prev) => ({
      ...prev,
      entries: prev.entries.filter((e) => e.id !== id),
    }));
  }, []);

  const removeAddress = useCallback(
    (id: string, passcode?: string): { success: boolean; error?: string } => {
      if (!isReauthenticated && (!passcode || !verifyPasscode(passcode))) {
        return {
          success: false,
          error: "Authentication required to remove allowlist address.",
        };
      }

      setSettings((prev) => ({
        ...prev,
        entries: prev.entries.map((e) =>
          e.id === id ? { ...e, status: "removed" as const } : e,
        ),
      }));
      return { success: true };
    },
    [isReauthenticated],
  );

  const checkDestination = useCallback(
    (address: string): WithdrawalCheckResult => {
      return validateWithdrawalDestination(address, settings);
    },
    [settings],
  );

  // Live evaluated entries
  const liveEntries = useMemo(() => {
    const now = new Date();
    return settings.entries
      .filter((e) => e.status !== "removed")
      .map((e) => ({
        ...e,
        evaluatedStatus: evaluateEntryStatus(e, now),
      }));
  }, [settings.entries]);

  return {
    settings,
    liveEntries,
    isReauthenticated,
    reauthenticate,
    setEnforcement,
    addAddress,
    cancelPending,
    removeAddress,
    checkDestination,
  };
}
