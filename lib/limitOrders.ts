import type { LimitOrder } from "@/lib/api";

export interface ProtocolLimitOrderConfig {
  minPricePerFraction: number; // 0.1 XLM
  maxPricePerFraction: number; // 1000 XLM
  minYieldPercent: number; // 1.0%
  maxYieldPercent: number; // 35.0%
  protocolFeeRate: number; // 0.005 (0.5%)
  defaultExpiryHours: number; // 72 hours
}

export const DEFAULT_PROTOCOL_LIMITS: ProtocolLimitOrderConfig = {
  minPricePerFraction: 0.1,
  maxPricePerFraction: 1000,
  minYieldPercent: 1.0,
  maxYieldPercent: 35.0,
  protocolFeeRate: 0.005,
  defaultExpiryHours: 72,
};

export interface LimitOrderValidationResult {
  valid: boolean;
  errors: string[];
}

export interface OrderBookAsk {
  price: number;
  quantity: number;
}

export interface LimitOrderMatchPreview {
  canMatchNow: boolean;
  requestedFractions: number;
  matchedFractions: number;
  unmatchedFractions: number;
  avgMatchPrice: number;
  totalCost: number;
  protocolFee: number;
  effectiveYieldPercent: number;
  totalEscrowRequired: number;
}

export interface ExtendedLimitOrder extends LimitOrder {
  target_yield?: number;
  filled_amount?: number;
  avg_execution_price?: number;
  expires_at?: string;
  audit_id?: string;
  signed_by?: string;
  signature?: string;
  cancelled_at?: string;
  matched_at?: string;
}

/**
 * Validates limit order builder inputs against protocol limits.
 */
export function validateLimitOrderInput(
  input: {
    fractionAmount: number;
    maxPricePerFraction: number;
    targetYieldPercent?: number | null;
  },
  config: ProtocolLimitOrderConfig = DEFAULT_PROTOCOL_LIMITS,
): LimitOrderValidationResult {
  const errors: string[] = [];

  if (
    !Number.isFinite(input.fractionAmount) ||
    !Number.isInteger(input.fractionAmount) ||
    input.fractionAmount < 1
  ) {
    errors.push("Fraction amount must be an integer of at least 1.");
  }

  if (
    !Number.isFinite(input.maxPricePerFraction) ||
    input.maxPricePerFraction < config.minPricePerFraction
  ) {
    errors.push(`Price cannot be below protocol minimum of ${config.minPricePerFraction} XLM.`);
  } else if (input.maxPricePerFraction > config.maxPricePerFraction) {
    errors.push(`Price cannot exceed protocol maximum of ${config.maxPricePerFraction} XLM.`);
  }

  if (
    input.targetYieldPercent !== undefined &&
    input.targetYieldPercent !== null &&
    Number.isFinite(input.targetYieldPercent)
  ) {
    if (input.targetYieldPercent < config.minYieldPercent) {
      errors.push(`Target yield cannot be below protocol minimum of ${config.minYieldPercent}%.`);
    } else if (input.targetYieldPercent > config.maxYieldPercent) {
      errors.push(`Target yield cannot exceed protocol cap of ${config.maxYieldPercent}%.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Computes pre-trade match preview against current ask book depth.
 * Shows matched fractions, average execution price, protocol fees, and resulting effective yield.
 */
export function calculateLimitOrderMatchPreview(
  fractionAmount: number,
  maxPricePerFraction: number,
  targetYieldPercent: number = 10,
  availableAsks: readonly OrderBookAsk[] = [],
  config: ProtocolLimitOrderConfig = DEFAULT_PROTOCOL_LIMITS,
): LimitOrderMatchPreview {
  const validAmount = Math.max(0, fractionAmount || 0);
  const maxPrice = Math.max(0, maxPricePerFraction || 0);

  // Filter asks at or below max price, sorted cheapest first
  const eligibleAsks = [...availableAsks]
    .filter((a) => a.price <= maxPrice && a.quantity > 0)
    .sort((a, b) => a.price - b.price);

  let remainingToMatch = validAmount;
  let totalMatchedCost = 0;
  let matchedFractions = 0;

  for (const ask of eligibleAsks) {
    if (remainingToMatch <= 0) break;
    const take = Math.min(remainingToMatch, ask.quantity);
    totalMatchedCost += take * ask.price;
    matchedFractions += take;
    remainingToMatch -= take;
  }

  const unmatchedFractions = validAmount - matchedFractions;
  const avgMatchPrice =
    matchedFractions > 0
      ? Math.round((totalMatchedCost / matchedFractions) * 10000) / 10000
      : maxPrice;

  // Escrow required covers entire order at max price
  const totalEscrowRequired = Math.round(validAmount * maxPrice * 10000) / 10000;
  const totalCost = matchedFractions > 0 ? totalMatchedCost : totalEscrowRequired;
  const protocolFee = Math.round(totalCost * config.protocolFeeRate * 10000) / 10000;

  // Effective yield accounts for discounted execution price vs par price
  const priceDiscountRatio = maxPrice > 0 ? maxPrice / avgMatchPrice : 1;
  const effectiveYieldPercent =
    Math.round(targetYieldPercent * priceDiscountRatio * 100) / 100;

  return {
    canMatchNow: matchedFractions > 0,
    requestedFractions: validAmount,
    matchedFractions,
    unmatchedFractions,
    avgMatchPrice,
    totalCost,
    protocolFee,
    effectiveYieldPercent,
    totalEscrowRequired,
  };
}

/**
 * Checks whether an order is expired.
 */
export function isLimitOrderExpired(
  order: ExtendedLimitOrder,
  nowMs: number = Date.now(),
): boolean {
  if (order.status === "expired") return true;
  if (!order.expires_at) return false;
  const expiry = Date.parse(order.expires_at);
  if (Number.isNaN(expiry)) return false;
  return expiry <= nowMs;
}

/**
 * Checks whether an order is eligible for execution.
 * Expired, cancelled, or filled terminal orders cannot execute.
 */
export function canExecuteLimitOrder(
  order: ExtendedLimitOrder,
  nowMs: number = Date.now(),
): boolean {
  if (isLimitOrderExpired(order, nowMs)) return false;
  if (order.status === "cancelled" || order.status === "filled") return false;
  return order.status === "open";
}
