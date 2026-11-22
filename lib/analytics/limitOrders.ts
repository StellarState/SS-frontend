/**
 * Price and yield limit order management analytics and validation for issue #688.
 *
 * Implements protocol limit boundaries, match preview calculations,
 * execution guards (expired orders blocked), cancellation audits,
 * and view filtering.
 */

export type LimitOrderStatus = "open" | "matched" | "cancelled" | "expired";

export type LimitOrderViewFilter = "all" | "open" | "matched" | "cancelled" | "expired";

export const MIN_LIMIT_PRICE_XLM = 0.01;
export const MAX_LIMIT_PRICE_XLM = 100000;
export const MIN_TARGET_YIELD_PERCENT = 1.0;
export const MAX_TARGET_YIELD_PERCENT = 50.0;
export const DEFAULT_EXPIRY_DAYS = 30;
export const MAX_EXPIRY_DAYS = 90;
export const PROTOCOL_MATCH_FEE_BPS = 50; // 0.50% matching fee

export interface ExtendedLimitOrder {
  id: string;
  invoice_id: string;
  buyer_address: string;
  fraction_amount: number;
  max_price_per_fraction: number;
  target_yield_percent?: number | null;
  total_escrowed: number;
  status: LimitOrderStatus;
  created_at: string;
  expires_at: string;
  matched_at?: string | null;
  matched_listing_id?: string | null;
  matched_price_per_fraction?: number | null;
  execution_fee?: number | null;
  effective_yield?: number | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
}

export interface ActiveListingCandidate {
  id: string;
  seller_address: string;
  price_per_fraction: number;
  available_fractions: number;
  invoice_annual_yield: number;
}

export interface OrderMatchPreview {
  canMatch: boolean;
  matchedPrice: number;
  matchedFractions: number;
  grossAmount: number;
  estimatedFee: number;
  netTotal: number;
  effectiveYield: number;
  savingsVsMaxPrice: number;
  matchStatusMessage: string;
}

export interface LimitOrderInput {
  fraction_amount: number;
  max_price_per_fraction: number;
  target_yield_percent?: number | null;
  expires_in_days?: number;
}

export interface LimitOrderValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Validates order input against protocol yield and price limits.
 * Acceptance criteria: Orders stay within protocol limits.
 */
export function validateLimitOrderInput(input: LimitOrderInput): LimitOrderValidationResult {
  const errors: Record<string, string> = {};

  // Validate fraction amount
  if (!Number.isFinite(input.fraction_amount) || input.fraction_amount <= 0) {
    errors.fraction_amount = "Fraction amount must be greater than 0.";
  } else if (!Number.isInteger(input.fraction_amount)) {
    errors.fraction_amount = "Fraction amount must be an integer.";
  }

  // Validate price limits
  if (!Number.isFinite(input.max_price_per_fraction) || input.max_price_per_fraction <= 0) {
    errors.max_price_per_fraction = "Max price per fraction is required.";
  } else if (input.max_price_per_fraction < MIN_LIMIT_PRICE_XLM) {
    errors.max_price_per_fraction = `Price cannot be lower than protocol minimum (${MIN_LIMIT_PRICE_XLM} XLM).`;
  } else if (input.max_price_per_fraction > MAX_LIMIT_PRICE_XLM) {
    errors.max_price_per_fraction = `Price cannot exceed protocol maximum (${MAX_LIMIT_PRICE_XLM.toLocaleString("en-US")} XLM).`;
  }

  // Validate yield limits if provided
  if (input.target_yield_percent !== undefined && input.target_yield_percent !== null) {
    if (!Number.isFinite(input.target_yield_percent)) {
      errors.target_yield_percent = "Yield percentage must be a valid number.";
    } else if (input.target_yield_percent < MIN_TARGET_YIELD_PERCENT) {
      errors.target_yield_percent = `Target yield cannot be lower than protocol floor (${MIN_TARGET_YIELD_PERCENT}%).`;
    } else if (input.target_yield_percent > MAX_TARGET_YIELD_PERCENT) {
      errors.target_yield_percent = `Target yield cannot exceed protocol cap (${MAX_TARGET_YIELD_PERCENT}%).`;
    }
  }

  // Validate expiry
  if (input.expires_in_days !== undefined) {
    if (!Number.isFinite(input.expires_in_days) || input.expires_in_days <= 0) {
      errors.expires_in_days = "Expiry duration must be at least 1 day.";
    } else if (input.expires_in_days > MAX_EXPIRY_DAYS) {
      errors.expires_in_days = `Expiry duration cannot exceed ${MAX_EXPIRY_DAYS} days.`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Previews match conditions against an active secondary listing.
 * Acceptance criteria: Match preview shows price, fees and yield.
 */
export function calculateOrderMatchPreview(
  order: {
    fraction_amount: number;
    max_price_per_fraction: number;
    target_yield_percent?: number | null;
  },
  candidateListing?: ActiveListingCandidate | null,
): OrderMatchPreview {
  const defaultGross = order.fraction_amount * order.max_price_per_fraction;
  const defaultFee = (defaultGross * PROTOCOL_MATCH_FEE_BPS) / 10000;

  if (!candidateListing) {
    return {
      canMatch: false,
      matchedPrice: order.max_price_per_fraction,
      matchedFractions: 0,
      grossAmount: defaultGross,
      estimatedFee: defaultFee,
      netTotal: defaultGross + defaultFee,
      effectiveYield: order.target_yield_percent ?? 10.0,
      savingsVsMaxPrice: 0,
      matchStatusMessage: "No immediate matching listing found. Order will wait in order book.",
    };
  }

  const isPriceEligible = candidateListing.price_per_fraction <= order.max_price_per_fraction;
  const isYieldEligible =
    !order.target_yield_percent || candidateListing.invoice_annual_yield >= order.target_yield_percent;

  const canMatch = isPriceEligible && isYieldEligible;
  const matchedPrice = candidateListing.price_per_fraction;
  const matchedFractions = Math.min(order.fraction_amount, candidateListing.available_fractions);
  const grossAmount = matchedFractions * matchedPrice;
  const estimatedFee = (grossAmount * PROTOCOL_MATCH_FEE_BPS) / 10000;
  const netTotal = grossAmount + estimatedFee;

  const maxGross = matchedFractions * order.max_price_per_fraction;
  const savingsVsMaxPrice = Math.max(0, maxGross - grossAmount);

  let matchStatusMessage = "Eligible match found! Ready for on-chain execution.";
  if (!isPriceEligible) {
    matchStatusMessage = `Listing price (${candidateListing.price_per_fraction} XLM) exceeds your limit (${order.max_price_per_fraction} XLM).`;
  } else if (!isYieldEligible) {
    matchStatusMessage = `Listing yield (${candidateListing.invoice_annual_yield}%) is below your target (${order.target_yield_percent}%).`;
  }

  return {
    canMatch,
    matchedPrice,
    matchedFractions,
    grossAmount,
    estimatedFee,
    netTotal,
    effectiveYield: candidateListing.invoice_annual_yield,
    savingsVsMaxPrice,
    matchStatusMessage,
  };
}

/**
 * Checks whether an order is expired.
 */
export function isOrderExpired(order: ExtendedLimitOrder, nowInput?: string | Date | number): boolean {
  const nowMs =
    nowInput instanceof Date
      ? nowInput.getTime()
      : typeof nowInput === "string"
        ? new Date(nowInput).getTime()
        : typeof nowInput === "number"
          ? nowInput
          : Date.now();

  const expiresMs = new Date(order.expires_at).getTime();
  return order.status === "expired" || expiresMs <= nowMs;
}

/**
 * Checks whether an order can be executed.
 * Acceptance criteria: Expired orders cannot execute.
 */
export function canExecuteOrder(order: ExtendedLimitOrder, nowInput?: string | Date | number): boolean {
  if (order.status !== "open") return false;
  if (isOrderExpired(order, nowInput)) return false;
  return true;
}

/**
 * Filters orders by view tab.
 * Acceptance criteria: Terminal orders remain auditable.
 */
export function filterOrdersByView(
  orders: readonly ExtendedLimitOrder[],
  view: LimitOrderViewFilter,
  nowInput?: string | Date | number,
): ExtendedLimitOrder[] {
  return orders
    .map((order) => {
      // Automatically derive expired status if past expiry date
      if (order.status === "open" && isOrderExpired(order, nowInput)) {
        return { ...order, status: "expired" as const };
      }
      return order;
    })
    .filter((order) => {
      if (view === "all") return true;
      return order.status === view;
    })
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
