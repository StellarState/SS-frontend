/** Debtor exposure and platform cap data (#602). */

import { API_BASE, asRecord, numberFrom, readJson } from "./shared";

export interface DebtorHeadroom {
  outstanding: number;
  cap: number;
  headroom: number;
}

/** Returns null when no cap is configured, so callers can hide the meter. */
export async function fetchDebtorHeadroom(debtorId: string): Promise<DebtorHeadroom | null> {
  try {
    const res = await fetch(`${API_BASE}/debtors/${encodeURIComponent(debtorId)}/headroom`);
    if (!res.ok) return null;
    const root = asRecord(await readJson(res));
    const cap = numberFrom(root.cap ?? root.cap_amount, Number.NaN);
    if (!Number.isFinite(cap) || cap <= 0) return null;
    const outstanding = numberFrom(root.outstanding ?? root.outstanding_amount);
    return {
      outstanding,
      cap,
      headroom: Math.max(0, numberFrom(root.headroom, cap - outstanding)),
    };
  } catch {
    return null;
  }
}
