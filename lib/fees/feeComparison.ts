/**
 * Protocol Fee Comparison Calculator Domain Engine (Issue #667).
 *
 * Implements fee calculation across user roles, transaction types,
 * discount tiers, protocol minimum/maximum fee caps, and multi-scenario comparison.
 */

export type UserRole = "investor" | "issuer" | "secondary_trader";

export type TransactionType =
  | "primary_purchase"
  | "secondary_trade"
  | "invoice_settlement"
  | "early_repayment";

export type FeeDiscountTier = "standard" | "bronze" | "silver" | "gold" | "platinum";

export interface FeeTierConfig {
  name: string;
  minVolume: number;
  discountPercentage: number;
  eligibleRoles: UserRole[];
}

export const PROTOCOL_FEE_TIERS: Record<FeeDiscountTier, FeeTierConfig> = {
  standard: {
    name: "Standard",
    minVolume: 0,
    discountPercentage: 0,
    eligibleRoles: ["investor", "issuer", "secondary_trader"],
  },
  bronze: {
    name: "Bronze Tier",
    minVolume: 1_000,
    discountPercentage: 0.1, // 10% discount
    eligibleRoles: ["investor", "issuer", "secondary_trader"],
  },
  silver: {
    name: "Silver Tier",
    minVolume: 10_000,
    discountPercentage: 0.25, // 25% discount
    eligibleRoles: ["investor", "issuer", "secondary_trader"],
  },
  gold: {
    name: "Gold Tier",
    minVolume: 50_000,
    discountPercentage: 0.4, // 40% discount
    eligibleRoles: ["investor", "issuer", "secondary_trader"],
  },
  platinum: {
    name: "Platinum Tier",
    minVolume: 250_000,
    discountPercentage: 0.6, // 60% discount
    eligibleRoles: ["investor", "secondary_trader"], // Issuers capped at Gold
  },
};

export interface TransactionTypeRule {
  name: string;
  baseRateBps: number; // Basis points (e.g. 50 bps = 0.5%)
  minFeeXLM: number;
  maxFeeXLM: number;
  networkFeeXLM: number;
}

export const TRANSACTION_TYPE_RULES: Record<TransactionType, TransactionTypeRule> = {
  primary_purchase: {
    name: "Primary Invoice Purchase",
    baseRateBps: 50, // 0.50%
    minFeeXLM: 0.05,
    maxFeeXLM: 500,
    networkFeeXLM: 0.00001,
  },
  secondary_trade: {
    name: "Secondary Marketplace Trade",
    baseRateBps: 35, // 0.35%
    minFeeXLM: 0.02,
    maxFeeXLM: 250,
    networkFeeXLM: 0.00001,
  },
  invoice_settlement: {
    name: "Invoice Settlement Claim",
    baseRateBps: 25, // 0.25%
    minFeeXLM: 0.01,
    maxFeeXLM: 150,
    networkFeeXLM: 0.00001,
  },
  early_repayment: {
    name: "Early Repayment Cure",
    baseRateBps: 15, // 0.15%
    minFeeXLM: 0.01,
    maxFeeXLM: 100,
    networkFeeXLM: 0.00001,
  },
};

export const PROTOCOL_LIMITS = {
  MIN_AMOUNT_XLM: 0.01,
  MAX_AMOUNT_XLM: 10_000_000,
  MAX_SCENARIOS: 5,
};

export interface FeeCalculationInput {
  amount: number;
  role: UserRole;
  transactionType: TransactionType;
  discountTier: FeeDiscountTier;
}

export interface FeeCalculationResult {
  amount: number;
  role: UserRole;
  transactionType: TransactionType;
  discountTier: FeeDiscountTier;
  rawBaseFee: number;
  clampedBaseFee: number;
  isMinFeeApplied: boolean;
  isMaxFeeApplied: boolean;
  discountPercentage: number;
  discountAmount: number;
  isDiscountEligible: boolean;
  ineligibilityReason?: string;
  protocolFee: number;
  networkFee: number;
  finalFee: number;
  totalCost: number;
  effectiveRatePercentage: number;
}

export interface ComparisonScenario extends FeeCalculationInput {
  id: string;
  label: string;
}

export interface ComparisonReport {
  scenarios: Array<{
    scenario: ComparisonScenario;
    result: FeeCalculationResult;
  }>;
  cheapestScenarioId: string | null;
  maxSavingsAmount: number;
}

/**
 * Calculates all fee components for a single input scenario.
 */
export function calculateProtocolFees(input: FeeCalculationInput): FeeCalculationResult {
  const { role, transactionType, discountTier } = input;
  // Enforce protocol amount limits
  const clampedAmount = Math.max(0, Math.min(input.amount, PROTOCOL_LIMITS.MAX_AMOUNT_XLM));

  const rule = TRANSACTION_TYPE_RULES[transactionType];
  const tierConfig = PROTOCOL_FEE_TIERS[discountTier];

  // 1. Base fee calculation
  const rawBaseFee = (clampedAmount * rule.baseRateBps) / 10_000;
  let clampedBaseFee = rawBaseFee;
  let isMinFeeApplied = false;
  let isMaxFeeApplied = false;

  if (clampedAmount > 0) {
    if (clampedBaseFee < rule.minFeeXLM) {
      clampedBaseFee = rule.minFeeXLM;
      isMinFeeApplied = true;
    } else if (clampedBaseFee > rule.maxFeeXLM) {
      clampedBaseFee = rule.maxFeeXLM;
      isMaxFeeApplied = true;
    }
  } else {
    clampedBaseFee = 0;
  }

  // 2. Discount eligibility
  const isDiscountEligible = tierConfig.eligibleRoles.includes(role);
  let discountPercentage = 0;
  let ineligibilityReason: string | undefined;

  if (isDiscountEligible) {
    discountPercentage = tierConfig.discountPercentage;
  } else {
    ineligibilityReason = `${tierConfig.name} discount is not applicable for ${role.replace("_", " ")} role.`;
  }

  // 3. Discount amount applied to clamped base fee
  const discountAmount = clampedBaseFee * discountPercentage;
  const protocolFee = Math.max(0, clampedBaseFee - discountAmount);

  // 4. Network fee & final total
  const networkFee = clampedAmount > 0 ? rule.networkFeeXLM : 0;
  const finalFee = protocolFee + networkFee;
  const totalCost = clampedAmount + finalFee;

  const effectiveRatePercentage =
    clampedAmount > 0 ? (finalFee / clampedAmount) * 100 : 0;

  return {
    amount: clampedAmount,
    role,
    transactionType,
    discountTier,
    rawBaseFee,
    clampedBaseFee,
    isMinFeeApplied,
    isMaxFeeApplied,
    discountPercentage,
    discountAmount,
    isDiscountEligible,
    ineligibilityReason,
    protocolFee,
    networkFee,
    finalFee,
    totalCost,
    effectiveRatePercentage,
  };
}

/**
 * Compares multiple fee scenarios (up to 5), identifying the most cost-effective setup.
 */
export function compareFeeScenarios(scenarios: ComparisonScenario[]): ComparisonReport {
  const boundedScenarios = scenarios.slice(0, PROTOCOL_LIMITS.MAX_SCENARIOS);
  
  const evaluated = boundedScenarios.map((scenario) => ({
    scenario,
    result: calculateProtocolFees(scenario),
  }));

  if (evaluated.length === 0) {
    return {
      scenarios: [],
      cheapestScenarioId: null,
      maxSavingsAmount: 0,
    };
  }

  let cheapestId = evaluated[0].scenario.id;
  let minFee = evaluated[0].result.finalFee;
  let maxFee = evaluated[0].result.finalFee;

  for (const item of evaluated) {
    if (item.result.finalFee < minFee) {
      minFee = item.result.finalFee;
      cheapestId = item.scenario.id;
    }
    if (item.result.finalFee > maxFee) {
      maxFee = item.result.finalFee;
    }
  }

  return {
    scenarios: evaluated,
    cheapestScenarioId: cheapestId,
    maxSavingsAmount: Math.max(0, maxFee - minFee),
  };
}
