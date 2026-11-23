/**
 * Withholding maths and display formatting (#601).
 *
 * Principal is never reduced. Only gross yield is subject to withholding, and
 * every value is quantised to seven decimals so the drawer, table and CSV all
 * show the same number.
 */

export const STELLAR_DECIMALS = 7;

export function roundStellar(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** STELLAR_DECIMALS;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function formatStellarAmount(value: number | null | undefined): string {
  const rounded = roundStellar(Number(value ?? 0));
  return rounded.toLocaleString("en-US", {
    minimumFractionDigits: STELLAR_DECIMALS,
    maximumFractionDigits: STELLAR_DECIMALS,
  });
}

export interface WithholdingBreakdown {
  principal: number;
  grossYield: number;
  ratePercentage: number;
  withheld: number;
  net: number;
}

export function computeWithholding(
  principal: number,
  grossYield: number,
  ratePercentage: number
): WithholdingBreakdown {
  const safePrincipal = roundStellar(Number.isFinite(principal) ? principal : 0);
  const safeYield = roundStellar(Number.isFinite(grossYield) ? grossYield : 0);
  const safeRate = Number.isFinite(ratePercentage)
    ? Math.max(0, Math.min(100, ratePercentage))
    : 0;
  const withheld = roundStellar((safeYield * safeRate) / 100);
  const net = roundStellar(safePrincipal + safeYield - withheld);
  return {
    principal: safePrincipal,
    grossYield: safeYield,
    ratePercentage: safeRate,
    withheld,
    net,
  };
}

/** Payout fields the withholding helpers need, from either API casing. */
export interface WithholdingPayout {
  amountInvested: number;
  amountReceived: number;
  yield?: number;
  withholding?: {
    rate_percentage?: number;
    ratePercentage?: number;
    withheld?: number;
    withheld_amount?: number;
  } | null;
  withholding_rate?: number;
  withheld_amount?: number;
}

function reportedWithheld(payout: WithholdingPayout): number | null {
  const value =
    payout.withholding?.withheld ??
    payout.withholding?.withheld_amount ??
    payout.withheld_amount;
  if (value === undefined || value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Uses the investor's current rate, but prefers a withheld amount reported on
 * the payout itself. Returns null for a zero or unavailable rate so callers
 * can hide the breakdown entirely.
 */
export function withholdingForPayout(
  payout: WithholdingPayout,
  settings?: { ratePercentage: number } | null
): WithholdingBreakdown | null {
  const reportedRate =
    payout.withholding?.rate_percentage ??
    payout.withholding?.ratePercentage ??
    payout.withholding_rate;
  const rawRate = Number(settings?.ratePercentage ?? reportedRate ?? 0);
  if (!Number.isFinite(rawRate) || rawRate <= 0) return null;
  const ratePercentage = Math.min(100, rawRate);

  const principal = payout.amountInvested;
  const receivedYield = payout.amountReceived - principal;
  const reported = reportedWithheld(payout);
  const grossYield =
    reported !== null
      ? receivedYield + reported
      : ratePercentage >= 100
        ? principal * (Number(payout.yield ?? 0) / 100)
        : receivedYield / (1 - ratePercentage / 100);
  return computeWithholding(principal, grossYield, ratePercentage);
}
