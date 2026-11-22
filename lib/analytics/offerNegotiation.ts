/**
 * Secondary market offer negotiation analytics and validation (#687).
 *
 * Implements offer builders, fair-value reference calculations,
 * authorization checks for accept/reject, expiry guards,
 * settlement transition, and audit history.
 */

export type OfferStatus = "pending" | "accepted" | "rejected" | "cancelled" | "expired";

export type OfferTabFilter = "incoming" | "outgoing" | "history" | "all";

export interface SecondaryOffer {
  id: string;
  invoice_id: string;
  listing_id: string;
  buyer_address: string;
  seller_address: string;
  quantity: number;
  price_per_fraction: number;
  total_offer_amount: number;
  fair_value_per_fraction: number;
  discount_premium_percent: number;
  effective_yield_percent: number;
  created_at: string;
  expires_at: string;
  status: OfferStatus;
  settlement_status?: "queued" | "settled" | null;
  signature?: string | null;
  rejection_reason?: string | null;
  cancelled_at?: string | null;
  resolved_at?: string | null;
}

export interface OfferBuilderInput {
  quantity: number;
  price_per_fraction: number;
  expires_in_hours: number;
  listing_id: string;
  signature?: string | null;
}

export interface ListingReference {
  id: string;
  seller_address: string;
  price_per_fraction: number;
  available_quantity: number;
  fair_value_per_fraction: number;
  invoice_annual_yield: number;
}

export interface OfferValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface OfferImpactAnalysis {
  totalAmount: number;
  fairValueTotal: number;
  discountPremiumPercent: number; // Negative = discount, Positive = premium
  isDiscount: boolean;
  projectedAnnualYield: number;
  savingsOrPremiumVsAsk: number;
}

export const MIN_OFFER_PRICE_XLM = 0.01;
export const MAX_OFFER_PRICE_XLM = 100000;
export const MIN_EXPIRY_HOURS = 1;
export const MAX_EXPIRY_HOURS = 168; // 7 days max

/**
 * Validates offer input fields against listing constraints and protocol rules.
 * Acceptance criteria: Offer amounts and quantities are valid.
 */
export function validateOfferInput(
  input: OfferBuilderInput,
  listing?: ListingReference | null,
): OfferValidationResult {
  const errors: Record<string, string> = {};

  // Quantity validation
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    errors.quantity = "Quantity must be greater than 0.";
  } else if (!Number.isInteger(input.quantity)) {
    errors.quantity = "Quantity must be a whole number of fractions.";
  } else if (listing && input.quantity > listing.available_quantity) {
    errors.quantity = `Quantity cannot exceed available listing amount (${listing.available_quantity}).`;
  }

  // Price validation
  if (!Number.isFinite(input.price_per_fraction) || input.price_per_fraction <= 0) {
    errors.price_per_fraction = "Offer price per fraction is required.";
  } else if (input.price_per_fraction < MIN_OFFER_PRICE_XLM) {
    errors.price_per_fraction = `Offer price cannot be less than ${MIN_OFFER_PRICE_XLM} XLM.`;
  } else if (input.price_per_fraction > MAX_OFFER_PRICE_XLM) {
    errors.price_per_fraction = `Offer price cannot exceed ${MAX_OFFER_PRICE_XLM.toLocaleString("en-US")} XLM.`;
  }

  // Expiry validation
  if (!Number.isFinite(input.expires_in_hours) || input.expires_in_hours < MIN_EXPIRY_HOURS) {
    errors.expires_in_hours = `Offer expiry must be at least ${MIN_EXPIRY_HOURS} hour.`;
  } else if (input.expires_in_hours > MAX_EXPIRY_HOURS) {
    errors.expires_in_hours = `Offer expiry cannot exceed ${MAX_EXPIRY_HOURS} hours (7 days).`;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Calculates fair-value benchmark, discount/premium, and projected yield.
 * Acceptance criteria: Show fair-value reference and offer impact.
 */
export function calculateOfferImpact(
  pricePerFraction: number,
  quantity: number,
  fairValuePerFraction: number,
  baseInvoiceYield: number,
  listingAskPrice?: number,
): OfferImpactAnalysis {
  const safeQty = Math.max(0, quantity);
  const totalAmount = safeQty * pricePerFraction;
  const fairValueTotal = safeQty * fairValuePerFraction;

  let discountPremiumPercent = 0;
  if (fairValuePerFraction > 0) {
    discountPremiumPercent = ((pricePerFraction - fairValuePerFraction) / fairValuePerFraction) * 100;
  }

  // Yield adjustment: Buying at a discount increases effective yield; premium decreases it
  // Formula: Effective Yield = Base Yield * (Fair Value / Purchase Price)
  let projectedAnnualYield = baseInvoiceYield;
  if (pricePerFraction > 0 && fairValuePerFraction > 0) {
    projectedAnnualYield = baseInvoiceYield * (fairValuePerFraction / pricePerFraction);
  }

  const askPrice = listingAskPrice ?? fairValuePerFraction;
  const savingsOrPremiumVsAsk = (askPrice - pricePerFraction) * safeQty;

  return {
    totalAmount,
    fairValueTotal,
    discountPremiumPercent: Number(discountPremiumPercent.toFixed(2)),
    isDiscount: discountPremiumPercent < 0,
    projectedAnnualYield: Number(projectedAnnualYield.toFixed(2)),
    savingsOrPremiumVsAsk: Number(savingsOrPremiumVsAsk.toFixed(4)),
  };
}

/**
 * Checks if an offer is expired based on current timestamp.
 */
export function isOfferExpired(
  offer: SecondaryOffer,
  nowInput?: string | Date | number,
): boolean {
  if (offer.status === "expired") return true;

  const nowMs =
    nowInput instanceof Date
      ? nowInput.getTime()
      : typeof nowInput === "string"
        ? new Date(nowInput).getTime()
        : typeof nowInput === "number"
          ? nowInput
          : Date.now();

  const expiresMs = new Date(offer.expires_at).getTime();
  return expiresMs <= nowMs;
}

/**
 * Validates whether the active wallet has authorization to accept or reject this offer.
 * Acceptance criteria: Only authorised parties accept or reject; Expired offers cannot execute.
 */
export function canAcceptOrRejectOffer(
  offer: SecondaryOffer,
  currentWalletAddress: string | null | undefined,
  nowInput?: string | Date | number,
): { canAct: boolean; reason?: string } {
  if (!currentWalletAddress) {
    return { canAct: false, reason: "Wallet not connected." };
  }

  if (isOfferExpired(offer, nowInput)) {
    return { canAct: false, reason: "Offer has expired and cannot be acted upon." };
  }

  if (offer.status !== "pending") {
    return { canAct: false, reason: `Offer is already ${offer.status}.` };
  }

  // Only the seller (recipient of the offer) can accept or reject
  const normalizedSeller = offer.seller_address.trim().toLowerCase();
  const normalizedCurrent = currentWalletAddress.trim().toLowerCase();

  if (normalizedSeller !== normalizedCurrent) {
    return {
      canAct: false,
      reason: "Unauthorized. Only the listing seller can accept or reject this offer.",
    };
  }

  return { canAct: true };
}

/**
 * Validates whether the active wallet can cancel their pending outgoing offer.
 */
export function canCancelOffer(
  offer: SecondaryOffer,
  currentWalletAddress: string | null | undefined,
  nowInput?: string | Date | number,
): { canCancel: boolean; reason?: string } {
  if (!currentWalletAddress) {
    return { canCancel: false, reason: "Wallet not connected." };
  }

  if (offer.status !== "pending") {
    return { canCancel: false, reason: `Offer is already ${offer.status}.` };
  }

  if (isOfferExpired(offer, nowInput)) {
    return { canCancel: false, reason: "Offer is already expired." };
  }

  const normalizedBuyer = offer.buyer_address.trim().toLowerCase();
  const normalizedCurrent = currentWalletAddress.trim().toLowerCase();

  if (normalizedBuyer !== normalizedCurrent) {
    return {
      canCancel: false,
      reason: "Unauthorized. Only the buyer who created this offer can cancel it.",
    };
  }

  return { canCancel: true };
}

/**
 * Transitions an offer to accepted and enters the settlement queue.
 * Acceptance criteria: Accepted offers enter settlement.
 */
export function executeAcceptOffer(
  offer: SecondaryOffer,
  signerAddress: string,
  nowInput?: string | Date | number,
): SecondaryOffer {
  const check = canAcceptOrRejectOffer(offer, signerAddress, nowInput);
  if (!check.canAct) {
    throw new Error(check.reason ?? "Cannot accept offer");
  }

  const nowIso =
    nowInput instanceof Date
      ? nowInput.toISOString()
      : typeof nowInput === "string"
        ? new Date(nowInput).toISOString()
        : typeof nowInput === "number"
          ? new Date(nowInput).toISOString()
          : new Date().toISOString();

  return {
    ...offer,
    status: "accepted",
    settlement_status: "queued",
    resolved_at: nowIso,
  };
}

/**
 * Transitions an offer to rejected with an audit trail reason.
 */
export function executeRejectOffer(
  offer: SecondaryOffer,
  signerAddress: string,
  rejectionReason: string,
  nowInput?: string | Date | number,
): SecondaryOffer {
  const check = canAcceptOrRejectOffer(offer, signerAddress, nowInput);
  if (!check.canAct) {
    throw new Error(check.reason ?? "Cannot reject offer");
  }

  const nowIso =
    nowInput instanceof Date
      ? nowInput.toISOString()
      : typeof nowInput === "string"
        ? new Date(nowInput).toISOString()
        : typeof nowInput === "number"
          ? new Date(nowInput).toISOString()
          : new Date().toISOString();

  return {
    ...offer,
    status: "rejected",
    rejection_reason: rejectionReason || "Seller declined terms",
    resolved_at: nowIso,
  };
}

/**
 * Transitions an offer to cancelled by buyer.
 */
export function executeCancelOffer(
  offer: SecondaryOffer,
  buyerAddress: string,
  nowInput?: string | Date | number,
): SecondaryOffer {
  const check = canCancelOffer(offer, buyerAddress, nowInput);
  if (!check.canCancel) {
    throw new Error(check.reason ?? "Cannot cancel offer");
  }

  const nowIso =
    nowInput instanceof Date
      ? nowInput.toISOString()
      : typeof nowInput === "string"
        ? new Date(nowInput).toISOString()
        : typeof nowInput === "number"
          ? new Date(nowInput).toISOString()
          : new Date().toISOString();

  return {
    ...offer,
    status: "cancelled",
    cancelled_at: nowIso,
    resolved_at: nowIso,
  };
}

/**
 * Filters and categorizes offers for UI tabs:
 * - "incoming": Seller is current user and offer is pending (not expired).
 * - "outgoing": Buyer is current user and offer is pending (not expired).
 * - "history": Offers involving current user that are accepted, rejected, cancelled, or expired.
 * - "all": All offers involving current user.
 */
export function filterOffersByTab(
  offers: readonly SecondaryOffer[],
  walletAddress: string | null | undefined,
  tab: OfferTabFilter,
  nowInput?: string | Date | number,
): SecondaryOffer[] {
  if (!walletAddress) return [];

  const normUser = walletAddress.trim().toLowerCase();

  // Map expired status dynamically if past expiry
  const normalizedOffers = offers.map((offer) => {
    if (offer.status === "pending" && isOfferExpired(offer, nowInput)) {
      return { ...offer, status: "expired" as const };
    }
    return offer;
  });

  return normalizedOffers.filter((offer) => {
    const isBuyer = offer.buyer_address.trim().toLowerCase() === normUser;
    const isSeller = offer.seller_address.trim().toLowerCase() === normUser;

    if (!isBuyer && !isSeller) return false;

    if (tab === "incoming") {
      return isSeller && offer.status === "pending";
    }

    if (tab === "outgoing") {
      return isBuyer && offer.status === "pending";
    }

    if (tab === "history") {
      return offer.status !== "pending";
    }

    // tab === "all"
    return true;
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
