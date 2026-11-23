/**
 * Early exit fee rules (#593).
 */

/** Fees above this percentage need an explicit acknowledgement. */
export const HIGH_EXIT_FEE_PERCENT = 2;

export function isHighExitFee(feePercent: number, waived: boolean): boolean {
  return !waived && feePercent > HIGH_EXIT_FEE_PERCENT;
}

/** How often the preview is refreshed while the modal is open. */
export const EXIT_PREVIEW_REFETCH_MS = 15_000;
