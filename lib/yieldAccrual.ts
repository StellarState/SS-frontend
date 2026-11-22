/**
 * Pure yield-accrual calculation for investor positions (#639).
 *
 * Formula: accrued = principal × (annualRatePct / 100) × (elapsedDays / 365)
 */

export interface AccrualInput {
  principal: number;
  annualRatePct: number;
  startDate: string; // ISO date string — funded_at or due_date equivalent
  maturityDate: string; // ISO date string
  now?: Date;
}

export interface AccrualResult {
  accruedAmount: number;
  projectedTotal: number;
  progressPct: number;
  isOverdue: boolean;
  lateInterest: number;
}

export function computeAccrual({
  principal,
  annualRatePct,
  startDate,
  maturityDate,
  now = new Date(),
}: AccrualInput): AccrualResult {
  const start = new Date(startDate).getTime();
  const maturity = new Date(maturityDate).getTime();
  const current = now.getTime();

  const totalDays = Math.max(0, (maturity - start) / (1000 * 60 * 60 * 24));
  const elapsedDays = Math.max(0, (current - start) / (1000 * 60 * 60 * 24));
  const isOverdue = current > maturity;

  const dailyRate = (annualRatePct / 100) / 365;

  // Accrued up to maturity (capped to maturity for the base amount)
  const cappedDays = Math.min(elapsedDays, totalDays);
  const accruedAmount = principal * dailyRate * cappedDays;

  // Projected total yield (principal × rate × totalDays/365)
  const projectedTotal = principal * dailyRate * totalDays;

  // Progress 0–100 through the term
  const progressPct =
    totalDays > 0 ? Math.min(100, (cappedDays / totalDays) * 100) : 0;

  // Late interest: extra days beyond maturity at the same daily rate
  const overdueDays = isOverdue
    ? (current - maturity) / (1000 * 60 * 60 * 24)
    : 0;
  const lateInterest = principal * dailyRate * overdueDays;

  return {
    accruedAmount,
    projectedTotal,
    progressPct,
    isOverdue,
    lateInterest,
  };
}
