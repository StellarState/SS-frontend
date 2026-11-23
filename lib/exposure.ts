/** Pure debtor-exposure helpers (#602). */

import type { DebtorHeadroom } from "@/lib/api/exposure";

export const NEAR_CAP_RATIO = 0.8;

export function headroomFor(outstanding: number, cap: number): DebtorHeadroom | null {
  if (!Number.isFinite(cap) || cap <= 0 || !Number.isFinite(outstanding)) return null;
  return {
    outstanding: Math.max(0, outstanding),
    cap,
    headroom: Math.max(0, cap - Math.max(0, outstanding)),
  };
}

export function usedRatio(headroom: DebtorHeadroom): number {
  if (headroom.cap <= 0) return 0;
  return Math.min(1, Math.max(0, headroom.outstanding / headroom.cap));
}

export function isNearCap(headroom: DebtorHeadroom): boolean {
  const ratio = usedRatio(headroom);
  return ratio >= NEAR_CAP_RATIO && ratio < 1;
}

export function isAtCap(headroom: DebtorHeadroom): boolean {
  return headroom.headroom <= 0;
}

/** Maximum amount that can still be invested without breaching the cap. */
export function maxAllowed(headroom: DebtorHeadroom, requestedCap: number): number {
  return Math.max(0, Math.min(requestedCap, headroom.headroom));
}

export function exceedsHeadroom(headroom: DebtorHeadroom, amount: number): boolean {
  return Number.isFinite(amount) && amount > headroom.headroom;
}
