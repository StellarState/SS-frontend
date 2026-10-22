import { DAYS_PER_YEAR } from "@/lib/returnsCalculator";

export interface InvestmentProjectionInput {
  fractionCount: number;
  fractionPrice: number;
  annualYieldPercent: number;
  holdDays: number;
  investmentFeePercent: number;
}

export function calculateInvestmentProjection(input: InvestmentProjectionInput) {
  const fractions = Number.isSafeInteger(input.fractionCount) && input.fractionCount > 0
    ? input.fractionCount : 0;
  const price = Number.isFinite(input.fractionPrice) && input.fractionPrice > 0
    ? input.fractionPrice : 0;
  const principal = fractions * price;
  const yieldPercent = Number.isFinite(input.annualYieldPercent)
    ? Math.max(0, input.annualYieldPercent) : 0;
  const days = Number.isFinite(input.holdDays) ? Math.max(0, input.holdDays) : 0;
  const projectedYield = principal * yieldPercent / 100 * days / DAYS_PER_YEAR;
  const feePercent = Number.isFinite(input.investmentFeePercent)
    ? Math.min(100, Math.max(0, input.investmentFeePercent)) : 0;
  const investmentFee = principal * feePercent / 100;
  const netProfit = projectedYield - investmentFee;
  const totalOutlay = principal + investmentFee;

  return {
    principal,
    grossProfit: projectedYield,
    investmentFee,
    totalOutlay,
    netProfit,
    netReturnPercent: totalOutlay > 0 ? netProfit / totalOutlay * 100 : 0,
  };
}
