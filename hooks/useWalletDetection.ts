"use client";

import { useCallback, useEffect, useState } from "react";
import { SUPPORTED_WALLETS, isWalletAvailable, type WalletKind } from "@/lib/stellar";

/** Why connecting is failing, most specific first. `null` = nothing wrong detected. */
export type WalletFailureReason = "not_installed" | "declined" | "connection_failed" | null;

export interface WalletDetection {
  availability: Record<WalletKind, boolean>;
  reason: WalletFailureReason;
}

/** Map availability plus the last connect error (from WalletContext) to a reason. */
export function classifyWalletFailure(
  availability: Record<WalletKind, boolean>,
  lastError?: string | null
): WalletFailureReason {
  if (!Object.values(availability).some(Boolean)) return "not_installed";
  if (!lastError) return null;
  if (/not detected/i.test(lastError)) return "not_installed";
  if (/declined|rejected/i.test(lastError)) return "declined";
  return "connection_failed";
}

export async function detectWallets(lastError?: string | null): Promise<WalletDetection> {
  const entries = await Promise.all(
    SUPPORTED_WALLETS.map(async (w) => [w, await isWalletAvailable(w).catch(() => false)] as const)
  );
  const availability = Object.fromEntries(entries) as Record<WalletKind, boolean>;
  return { availability, reason: classifyWalletFailure(availability, lastError) };
}

/** Detect installed wallets and the failure reason; `recheck` re-runs without a reload. */
export function useWalletDetection(enabled: boolean, lastError?: string | null) {
  const [detection, setDetection] = useState<WalletDetection | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const recheck = useCallback(async () => {
    setIsChecking(true);
    try {
      setDetection(await detectWallets(lastError));
    } finally {
      setIsChecking(false);
    }
  }, [lastError]);

  useEffect(() => {
    if (enabled) void recheck();
  }, [enabled, recheck]);

  return { detection, isChecking, recheck };
}
