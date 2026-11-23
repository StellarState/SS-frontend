/**
 * Delegated payout operators (#591).
 *
 * An operator is a custodian address allowed to trigger payout claims on an
 * investor's behalf. Funds always land in the investor's own wallet; the
 * operator only pays the transaction.
 */

import type { PayoutOperator } from "@/lib/api";
import { stellarAddressError } from "@/lib/stellarAddress";

/** The contract caps how many operators can be active at once. */
export const MAX_ACTIVE_OPERATORS = 5;

export const OPERATOR_EXPLANATION =
  "Operators can claim payouts to your wallet only. They can never move your funds, withdraw to another address, or trade your positions.";

export type OperatorStatus = "active" | "expired";

export function operatorStatus(operator: PayoutOperator, now: number = Date.now()): OperatorStatus {
  const expiry = new Date(operator.expires_at).getTime();
  return Number.isFinite(expiry) && expiry > now ? "active" : "expired";
}

export function countActiveOperators(operators: PayoutOperator[], now: number = Date.now()): number {
  return operators.filter((op) => operatorStatus(op, now) === "active").length;
}

/** Inline error for the operator address field, or null when valid. */
export function operatorAddressError(
  address: string,
  investor: string | null | undefined,
  existing: PayoutOperator[],
  now: number = Date.now(),
): string | null {
  const trimmed = address.trim();
  if (!trimmed) return "Enter the operator's Stellar address.";
  const formatError = stellarAddressError(trimmed);
  if (formatError) return formatError;
  if (investor && trimmed === investor) return "You cannot approve your own wallet as an operator.";
  if (existing.some((op) => op.address === trimmed && operatorStatus(op, now) === "active")) {
    return "This operator is already approved.";
  }
  return null;
}

/** Inline error for the expiry date (YYYY-MM-DD), or null when valid. */
export function operatorExpiryError(date: string, now: number = Date.now()): string | null {
  if (!date) return "Choose an expiry date.";
  const expiry = expiryDateToIso(date);
  if (!expiry) return "Enter a valid date.";
  if (new Date(expiry).getTime() <= now) return "Expiry must be in the future.";
  return null;
}

/** Converts a date-picker value into an end-of-day UTC timestamp. */
export function expiryDateToIso(date: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const ms = Date.parse(`${date}T23:59:59.000Z`);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}
