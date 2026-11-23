/**
 * Underwriting cover maths (#587).
 *
 * Kept free of React so the capacity rule the panel enforces is the same one
 * the tests pin down.
 */

/** Premium earned on `amount` at `ratePercent` (e.g. 4.5 → 4.5%). */
export function projectedPremium(amount: number, ratePercent: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (!Number.isFinite(ratePercent) || ratePercent <= 0) return 0;
  return Math.round(amount * ratePercent * 1e5) / 1e7;
}

/** Share of the cap already staked, clamped to 0-100. */
export function coverPercent(staked: number, maxCover: number): number {
  if (!(maxCover > 0)) return 0;
  return Math.min(100, Math.max(0, (staked / maxCover) * 100));
}

/**
 * Why a stake cannot be submitted, or null when it can. A stake above the
 * remaining capacity would be rejected on-chain, so it is blocked here first.
 */
export function stakeAmountError(raw: string, remainingCapacity: number): string | null {
  if (raw.trim() === "") return null;
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0) return "Enter a stake greater than 0.";
  if (remainingCapacity <= 0) return "This invoice is fully covered — no capacity remains.";
  if (amount > remainingCapacity) {
    return `Stake exceeds the remaining capacity of ${remainingCapacity.toLocaleString()} XLM.`;
  }
  return null;
}

/** A stake can be released only once the invoice has settled. */
export function canReleaseStake(
  invoiceStatus: string,
  userStake: number,
  alreadyReleased: boolean,
): boolean {
  return invoiceStatus === "settled" && userStake > 0 && !alreadyReleased;
}
