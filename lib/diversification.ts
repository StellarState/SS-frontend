import type { InvestmentPosition } from "@/lib/portfolio";

/** Limit applied when a wallet has never configured one. */
export const DEFAULT_DIVERSIFICATION_LIMIT_PCT = 30;
export const MIN_DIVERSIFICATION_LIMIT_PCT = 10;
export const MAX_DIVERSIFICATION_LIMIT_PCT = 100;

/** A position at or above this share of the limit is flagged as approaching it. */
export const NEAR_LIMIT_RATIO = 0.8;

export interface ConcentrationSlice {
  invoice_id: string;
  invoice_title: string;
  /** Committed amount held in this invoice. */
  amount: number;
  /** Share of the active portfolio held in this invoice, in percent. */
  share_percent: number;
}

export type ConcentrationStatus = "breached" | "near" | "ok";

/**
 * Validates a diversification limit input. Returns an error message when the
 * value is outside the supported 10-100% range, or null when it is valid.
 */
export function validateDiversificationLimit(value: number): string | null {
  if (!Number.isFinite(value)) {
    return `Limit must be between ${MIN_DIVERSIFICATION_LIMIT_PCT}% and ${MAX_DIVERSIFICATION_LIMIT_PCT}%.`;
  }
  if (
    value < MIN_DIVERSIFICATION_LIMIT_PCT ||
    value > MAX_DIVERSIFICATION_LIMIT_PCT
  ) {
    return `Limit must be between ${MIN_DIVERSIFICATION_LIMIT_PCT}% and ${MAX_DIVERSIFICATION_LIMIT_PCT}%.`;
  }
  return null;
}

/**
 * Splits the active portfolio across the invoices it holds, as percentages of
 * the active total, largest share first. Settled, expired and defaulted
 * positions are excluded because they no longer carry exposure.
 */
export function buildConcentration(
  positions: InvestmentPosition[],
): ConcentrationSlice[] {
  const active = positions.filter((p) => p.status === "active");
  const total = active.reduce((sum, p) => sum + p.committed_amount, 0);
  if (total <= 0) return [];

  return active
    .map((p) => ({
      invoice_id: p.invoice_id,
      invoice_title: p.invoice_title,
      amount: p.committed_amount,
      share_percent: (p.committed_amount / total) * 100,
    }))
    .sort((a, b) => b.share_percent - a.share_percent);
}

/**
 * Whether a position breaches the configured limit, is approaching it, or is
 * comfortably within it.
 */
export function getConcentrationStatus(
  sharePercent: number,
  limitPct: number,
): ConcentrationStatus {
  if (sharePercent >= limitPct) return "breached";
  if (sharePercent >= limitPct * NEAR_LIMIT_RATIO) return "near";
  return "ok";
}

/** The limit to display: the configured one, or the default. */
export function resolveDiversificationLimit(limitPct: number | null | undefined): number {
  if (limitPct === null || limitPct === undefined) {
    return DEFAULT_DIVERSIFICATION_LIMIT_PCT;
  }
  return limitPct;
}
