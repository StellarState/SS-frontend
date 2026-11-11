/**
 * Pro-rata returns maths for the invoice detail calculator (#501, #564).
 *
 * An investment buys whole fractions at the current fraction price. Its share
 * of the invoice is fractions held over total fractions, and the projected
 * yield accrues simple interest on the amount actually invested for the days
 * left until maturity (or custom hold duration).
 */

export const DAYS_PER_YEAR = 365;
export const DEFAULT_FRACTION_PRICE = 1;
const MS_PER_DAY = 86_400_000;

export interface ReturnsInputs {
  /** Hypothetical investment in XLM. */
  amount: number;
  /** Price of one fraction in XLM. */
  fractionPrice: number;
  /** Face value of the whole invoice in XLM. */
  faceValue: number;
  /** Annualised yield in percent. */
  yieldPercentage: number;
  /** Whole days left until maturity (or custom hold duration). */
  daysRemaining: number;
  /** Optional issuer dynamic yield percentage; takes precedence over yieldPercentage when available. */
  dynamicYieldPercentage?: number | null;
  /** Optional platform investment fee rate percentage (e.g. 1 for 1%). */
  feeRatePercentage?: number | null;
  /** Optional XLM/USD exchange rate. */
  xlmUsdRate?: number | null;
  /** Optional max funding cap or available amount in XLM. */
  fundingCap?: number | null;
}

export interface ReturnsResult {
  fractionCount: number;
  totalFractions: number;
  /** Percentage of the total supply held, 0-100. */
  shareOfSupply: number;
  /** Amount actually spent on whole fractions in XLM. */
  investedAmount: number;
  /** Uninvested remainder from fractional rounding (amount - investedAmount). */
  remainderAmount: number;
  /** Whether the requested investment exceeds the funding cap or available face value. */
  isOverCap: boolean;
  /** Yield rate actually used (dynamic or fallback). */
  effectiveYieldPercentage: number;
  /** Gross projected yield in XLM (aliased to projectedYield for backward compatibility). */
  projectedYield: number;
  grossReturn: number;
  /** Platform fee deduction in XLM. */
  feeAmount: number;
  /** Net return in XLM (grossReturn - feeAmount). */
  netReturn: number;
  /** Net return on investment in percent. */
  netRoiPercentage: number;
  /** Total projected payout (investedAmount + netReturn). */
  projectedPayout: number;
  /** USD conversions (only defined when xlmUsdRate is provided). */
  investedAmountUsd?: number;
  grossReturnUsd?: number;
  feeAmountUsd?: number;
  netReturnUsd?: number;
  projectedPayoutUsd?: number;
}

function positive(n: number | null | undefined): number {
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : 0;
}

export function daysUntil(date: string | null | undefined, now: number = Date.now()): number {
  if (!date) return 0;
  const target = new Date(date).getTime();
  if (Number.isNaN(target)) return 0;
  return Math.max(0, Math.ceil((target - now) / MS_PER_DAY));
}

export function daysBetween(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined
): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.ceil((end - start) / MS_PER_DAY));
}

export function parseAmount(raw: string): number {
  return positive(Number(raw));
}

export function calculateReturns(inputs: ReturnsInputs): ReturnsResult {
  const price = positive(inputs.fractionPrice) || DEFAULT_FRACTION_PRICE;
  const faceVal = positive(inputs.faceValue);
  const cap = inputs.fundingCap !== undefined && inputs.fundingCap !== null ? positive(inputs.fundingCap) : faceVal;

  const rawAmount = positive(inputs.amount);
  const isOverCap = cap > 0 && rawAmount > cap;

  // Use effective cap if over-cap
  const eligibleAmount = isOverCap ? cap : rawAmount;

  const totalFractions = Math.floor(faceVal / price);
  const fractionCount = Math.floor(eligibleAmount / price);
  const investedAmount = fractionCount * price;
  const remainderAmount = rawAmount > investedAmount ? rawAmount - investedAmount : 0;

  const shareOfSupply = totalFractions > 0 ? (fractionCount / totalFractions) * 100 : 0;

  // Select yield: use issuer dynamic yield if provided, else fall back to invoice yield
  const effectiveYieldPercentage =
    inputs.dynamicYieldPercentage !== undefined && inputs.dynamicYieldPercentage !== null && inputs.dynamicYieldPercentage > 0
      ? inputs.dynamicYieldPercentage
      : positive(inputs.yieldPercentage);

  const days = positive(inputs.daysRemaining);
  const grossReturn =
    investedAmount * (effectiveYieldPercentage / 100) * (days / DAYS_PER_YEAR);

  // Platform fee deduction: computed per investment fee schedule on the gross yield
  const feeRate = positive(inputs.feeRatePercentage);
  const feeAmount = feeRate > 0 ? (grossReturn * feeRate) / 100 : 0;
  const netReturn = Math.max(0, grossReturn - feeAmount);

  const netRoiPercentage = investedAmount > 0 ? (netReturn / investedAmount) * 100 : 0;
  const projectedPayout = investedAmount + netReturn;

  const result: ReturnsResult = {
    fractionCount,
    totalFractions,
    shareOfSupply,
    investedAmount,
    remainderAmount,
    isOverCap,
    effectiveYieldPercentage,
    projectedYield: grossReturn,
    grossReturn,
    feeAmount,
    netReturn,
    netRoiPercentage,
    projectedPayout,
  };

  // USD conversions only if valid xlmUsdRate is provided
  const usdRate = inputs.xlmUsdRate;
  if (typeof usdRate === "number" && Number.isFinite(usdRate) && usdRate > 0) {
    result.investedAmountUsd = investedAmount * usdRate;
    result.grossReturnUsd = grossReturn * usdRate;
    result.feeAmountUsd = feeAmount * usdRate;
    result.netReturnUsd = netReturn * usdRate;
    result.projectedPayoutUsd = projectedPayout * usdRate;
  }

  return result;
}
