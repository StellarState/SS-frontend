"use client";

import { useEffect, useState } from "react";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const MINUTE_IN_MS = 60 * 1000;
const MAX_TIMEOUT_IN_MS = 2_147_483_647;

export interface LockupStatus {
  locked: boolean;
  daysRemaining: number;
  countdown: string | null;
}

export function getLockupStatus(
  expiresAt: string | null | undefined,
  now: number,
): LockupStatus {
  const expiry = expiresAt ? Date.parse(expiresAt) : Number.NaN;
  const remainingMs = expiry - now;

  if (!Number.isFinite(expiry) || remainingMs <= 0) {
    return { locked: false, daysRemaining: 0, countdown: null };
  }

  if (remainingMs <= DAY_IN_MS) {
    if (remainingMs < MINUTE_IN_MS) {
      return { locked: true, daysRemaining: 1, countdown: "Unlocks in less than 1 minute" };
    }

    const remainingMinutes = Math.floor(remainingMs / MINUTE_IN_MS);
    const hours = Math.floor(remainingMinutes / 60);
    const minutes = remainingMinutes % 60;
    const time = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    return { locked: true, daysRemaining: 1, countdown: `Unlocks in ${time}` };
  }

  return {
    locked: true,
    daysRemaining: Math.ceil(remainingMs / DAY_IN_MS),
    countdown: null,
  };
}

export function useLockupStatus(expiresAt: string | null | undefined): LockupStatus {
  const [now, setNow] = useState(() => Date.now());
  const expiry = expiresAt ? Date.parse(expiresAt) : Number.NaN;
  const status = getLockupStatus(expiresAt, now);

  useEffect(() => {
    setNow(Date.now());
    if (!Number.isFinite(expiry) || expiry <= Date.now() || !status.locked) return;

    const refresh = () => setNow(Date.now());
    const intervalId = window.setInterval(refresh, MINUTE_IN_MS);
    const timeoutId = window.setTimeout(
      refresh,
      Math.min(expiry - Date.now() + 1, MAX_TIMEOUT_IN_MS),
    );

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [expiry, status.locked]);

  return status;
}
