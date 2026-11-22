/** Pure debtor-status rules (#606). */

import type { DebtorStatus, DebtorStatusResult } from "@/lib/api/debtorStatus";

export const MAX_STATUS_HISTORY = 10;

export const STATUS_VARIANT: Record<DebtorStatus, "default" | "secondary" | "outline" | "destructive"> = {
  Trusted: "default",
  Neutral: "secondary",
  Watch: "outline",
  Blocked: "destructive",
};

export function isBlocked(status: DebtorStatus): boolean {
  return status === "Blocked";
}

export function isWatch(status: DebtorStatus): boolean {
  return status === "Watch";
}

export function recentHistory(result: DebtorStatusResult) {
  return [...result.history]
    .sort((a, b) => b.changedAt.localeCompare(a.changedAt))
    .slice(0, MAX_STATUS_HISTORY);
}
