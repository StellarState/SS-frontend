export interface FundingDepthLevel {
  /** Cumulative XLM committed at this point on the funding curve. */
  committed: number;
  /** Estimated number of hours to reach this level from the current rate. */
  estimatedHours: number | null;
}

export interface FundingDepthSnapshot {
  levels: FundingDepthLevel[];
  updatedAt: string;
  live: boolean;
}

export function normalizeFundingDepth(snapshot: FundingDepthSnapshot) {
  const levels = snapshot.levels
    .filter((level) => Number.isFinite(level.committed) && level.committed >= 0)
    .sort((a, b) => a.committed - b.committed);
  return levels.map((level) => ({
    ...level,
    committed: Math.round(level.committed * 100) / 100,
    estimatedHours:
      level.estimatedHours !== null && Number.isFinite(level.estimatedHours)
        ? Math.max(0, level.estimatedHours)
        : null,
  }));
}

export function formatFundingDepthAmount(amount: number): string {
  return `${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} XLM`;
}
