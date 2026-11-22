"use client";

/**
 * Secondary market offer negotiation panel (#687).
 *
 * Implements offer builder with fair-value reference, real-time discount/yield impact,
 * incoming/outgoing/history tabs, authorized accept/reject workflows,
 * expiration guards, and settlement queue entry.
 */

import { useState } from "react";
import {
  Loader2,
  AlertCircle,
  Clock,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  XCircle,
  FileCheck2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  validateOfferInput,
  calculateOfferImpact,
  isOfferExpired,
  canAcceptOrRejectOffer,
  canCancelOffer,
  filterOffersByTab,
  type SecondaryOffer,
  type ListingReference,
  type OfferTabFilter,
  MIN_OFFER_PRICE_XLM,
  MAX_OFFER_PRICE_XLM,
} from "@/lib/analytics/offerNegotiation";
import {
  useSecondaryOffers,
  useCreateOfferMutation,
  useAcceptOfferMutation,
  useRejectOfferMutation,
  useCancelOfferMutation,
} from "@/hooks/useOfferNegotiation";

function formatAmount(n: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Offer Builder Form ───────────────────────────────────────────────────────

interface OfferBuilderProps {
  invoiceId: string;
  walletAddress: string | null | undefined;
  activeListing: ListingReference;
  onOfferPlaced?: () => void;
}

export function OfferBuilder({
  invoiceId,
  walletAddress,
  activeListing,
  onOfferPlaced,
}: OfferBuilderProps) {
  const [quantity, setQuantity] = useState("");
  const [pricePerFraction, setPricePerFraction] = useState("");
  const [expiryHours, setExpiryHours] = useState("24");
  const [isSigned, setIsSigned] = useState(false);

  const createMutation = useCreateOfferMutation(walletAddress);

  const quantityNum = parseInt(quantity, 10);
  const priceNum = parseFloat(pricePerFraction);
  const expiryHoursNum = parseInt(expiryHours, 10) || 24;

  const validation = validateOfferInput(
    {
      quantity: quantityNum,
      price_per_fraction: priceNum,
      expires_in_hours: expiryHoursNum,
      listing_id: activeListing.id,
    },
    activeListing,
  );

  const isFormValid = validation.isValid;

  // Impact analysis
  const impact = isFormValid
    ? calculateOfferImpact(
        priceNum,
        quantityNum,
        activeListing.fair_value_per_fraction,
        activeListing.invoice_annual_yield,
        activeListing.price_per_fraction,
      )
    : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isFormValid || !isSigned) return;

    createMutation.mutate(
      {
        invoice_id: invoiceId,
        listing_id: activeListing.id,
        seller_address: activeListing.seller_address,
        quantity: quantityNum,
        price_per_fraction: priceNum,
        expires_in_hours: expiryHoursNum,
        fair_value: activeListing.fair_value_per_fraction,
        base_yield: activeListing.invoice_annual_yield,
        signature: `sig_${walletAddress?.slice(0, 8)}_${Date.now()}`,
      },
      {
        onSuccess: () => {
          setQuantity("");
          setPricePerFraction("");
          setIsSigned(false);
          onOfferPlaced?.();
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="offer-builder-form">
      <div className="rounded-lg border bg-muted/20 p-3 text-xs space-y-1" data-testid="listing-reference-box">
        <div className="flex justify-between font-medium">
          <span className="text-muted-foreground">Listing Asking Price:</span>
          <span className="font-semibold text-foreground">{formatAmount(activeListing.price_per_fraction)} XLM</span>
        </div>
        <div className="flex justify-between font-medium">
          <span className="text-muted-foreground">Fair-Value Reference:</span>
          <span className="font-semibold text-foreground" data-testid="fair-value-reference">
            {formatAmount(activeListing.fair_value_per_fraction)} XLM
          </span>
        </div>
        <div className="flex justify-between font-medium">
          <span className="text-muted-foreground">Available Quantity:</span>
          <span>{activeListing.available_quantity} fractions</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {/* Quantity */}
        <div className="space-y-1.5">
          <Label htmlFor="offer-quantity">Quantity to Buy</Label>
          <Input
            id="offer-quantity"
            type="number"
            min="1"
            max={activeListing.available_quantity}
            step="1"
            placeholder={`Max ${activeListing.available_quantity}`}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            data-testid="offer-quantity-input"
          />
          {validation.errors.quantity && (
            <p className="text-xs text-destructive" data-testid="error-offer-quantity">
              {validation.errors.quantity}
            </p>
          )}
        </div>

        {/* Price per fraction */}
        <div className="space-y-1.5">
          <Label htmlFor="offer-price">Offered Price / Fraction (XLM)</Label>
          <Input
            id="offer-price"
            type="number"
            min={MIN_OFFER_PRICE_XLM}
            max={MAX_OFFER_PRICE_XLM}
            step="0.01"
            placeholder="e.g. 95.00"
            value={pricePerFraction}
            onChange={(e) => setPricePerFraction(e.target.value)}
            data-testid="offer-price-input"
          />
          {validation.errors.price_per_fraction && (
            <p className="text-xs text-destructive" data-testid="error-offer-price">
              {validation.errors.price_per_fraction}
            </p>
          )}
        </div>

        {/* Binding Expiry Duration */}
        <div className="space-y-1.5">
          <Label htmlFor="offer-expiry">Binding Expiry Duration</Label>
          <select
            id="offer-expiry"
            value={expiryHours}
            onChange={(e) => setExpiryHours(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            data-testid="offer-expiry-select"
          >
            <option value="12">12 Hours</option>
            <option value="24">24 Hours</option>
            <option value="48">48 Hours</option>
            <option value="72">72 Hours</option>
            <option value="168">7 Days</option>
          </select>
        </div>
      </div>

      {/* Fair-Value Reference & Offer Impact Banner */}
      {isFormValid && impact && (
        <div
          className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs space-y-2"
          data-testid="offer-impact-card"
          role="region"
          aria-label="Offer fair-value impact"
        >
          <div className="flex items-center justify-between font-semibold">
            <span className="flex items-center gap-1.5">
              {impact.isDiscount ? (
                <TrendingDown className="h-4 w-4 text-emerald-600" />
              ) : (
                <TrendingUp className="h-4 w-4 text-amber-600" />
              )}
              <span>Fair-Value Impact Analysis</span>
            </span>
            <Badge
              variant={impact.isDiscount ? "default" : "secondary"}
              className="text-[10px]"
              data-testid="discount-premium-badge"
            >
              {impact.isDiscount
                ? `${Math.abs(impact.discountPremiumPercent)}% Below Fair Value`
                : `${impact.discountPremiumPercent}% Above Fair Value`}
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-muted-foreground">
            <div>
              <span>Total Offer Value:</span>{" "}
              <span className="font-semibold text-foreground" data-testid="impact-total-amount">
                {formatAmount(impact.totalAmount)} XLM
              </span>
            </div>
            <div>
              <span>Projected Yield:</span>{" "}
              <span className="font-semibold text-foreground" data-testid="impact-projected-yield">
                {impact.projectedAnnualYield}% APY
              </span>
            </div>
            <div>
              <span>Discount vs Ask:</span>{" "}
              <span className="font-semibold text-foreground" data-testid="impact-savings">
                {formatAmount(impact.savingsOrPremiumVsAsk)} XLM
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Signature Requirement */}
      <div className="flex items-start space-x-2 rounded border bg-muted/30 p-2.5 text-xs">
        <input
          type="checkbox"
          id="offer-signature"
          checked={isSigned}
          onChange={(e) => setIsSigned(e.target.checked)}
          className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
          data-testid="offer-signature-checkbox"
        />
        <label htmlFor="offer-signature" className="text-muted-foreground leading-snug">
          I sign and authorize this binding offer with my wallet (
          <span className="font-mono text-foreground">{walletAddress?.slice(0, 10)}...</span>).
          Unaccepted offers automatically expire after {expiryHours} hours.
        </label>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={!isFormValid || !isSigned || createMutation.isPending}
        data-testid="submit-offer-btn"
      >
        {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Submit Binding Offer
      </Button>
    </form>
  );
}

// ─── Offer Inbox & Management ────────────────────────────────────────────────

interface OfferInboxProps {
  invoiceId?: string;
  walletAddress: string | null | undefined;
  offersOverride?: SecondaryOffer[];
}

export function OfferInbox({ invoiceId, walletAddress, offersOverride }: OfferInboxProps) {
  const { data: fetchedOffers, isLoading } = useSecondaryOffers(walletAddress, invoiceId);
  const acceptMutation = useAcceptOfferMutation(walletAddress);
  const rejectMutation = useRejectOfferMutation(walletAddress);
  const cancelMutation = useCancelOfferMutation(walletAddress);

  const [activeTab, setActiveTab] = useState<OfferTabFilter>("incoming");
  const [rejectingOfferId, setRejectingOfferId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  if (!walletAddress) return null;

  if (isLoading && !offersOverride) {
    return (
      <div className="space-y-2" data-testid="offer-inbox-loading">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  const allOffers = offersOverride ?? fetchedOffers ?? [];
  const currentOffers = filterOffersByTab(allOffers, walletAddress, activeTab);

  const counts = {
    incoming: filterOffersByTab(allOffers, walletAddress, "incoming").length,
    outgoing: filterOffersByTab(allOffers, walletAddress, "outgoing").length,
    history: filterOffersByTab(allOffers, walletAddress, "history").length,
    all: filterOffersByTab(allOffers, walletAddress, "all").length,
  };

  const handleAccept = (offerId: string) => {
    acceptMutation.mutate({ offerId });
  };

  const handleConfirmReject = (offerId: string) => {
    rejectMutation.mutate(
      { offerId, reason: rejectionReason },
      {
        onSettled: () => {
          setRejectingOfferId(null);
          setRejectionReason("");
        },
      },
    );
  };

  const handleCancel = (offerId: string) => {
    cancelMutation.mutate({ offerId });
  };

  return (
    <div className="space-y-3" data-testid="offer-inbox-section">
      {/* Tab Navigation */}
      <div className="flex gap-1.5 border-b pb-2 text-xs" data-testid="offer-inbox-tabs">
        {(["incoming", "outgoing", "history", "all"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
              activeTab === tab
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground hover:bg-muted"
            }`}
            data-testid={`tab-offer-${tab}`}
          >
            {tab === "history" ? "Audit History" : tab} ({counts[tab]})
          </button>
        ))}
      </div>

      {currentOffers.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground" data-testid="no-offers-message">
          No {activeTab} offers found.
        </p>
      ) : (
        <ul className="space-y-2.5" aria-label="Secondary offers list" data-testid="offers-list">
          {currentOffers.map((offer) => {
            const expired = isOfferExpired(offer);
            const acceptCheck = canAcceptOrRejectOffer(offer, walletAddress);
            const cancelCheck = canCancelOffer(offer, walletAddress);

            return (
              <li
                key={offer.id}
                className="flex flex-col gap-2 rounded-lg border px-4 py-3"
                data-testid={`offer-card-${offer.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {offer.quantity} fractions @ {formatAmount(offer.price_per_fraction)} XLM
                      </span>
                      <Badge
                        variant={
                          offer.status === "accepted"
                            ? "default"
                            : offer.status === "rejected"
                              ? "destructive"
                              : offer.status === "cancelled"
                                ? "secondary"
                                : expired || offer.status === "expired"
                                  ? "outline"
                                  : "default"
                        }
                        data-testid={`offer-status-badge-${offer.id}`}
                      >
                        {expired && offer.status === "pending"
                          ? "EXPIRED"
                          : offer.status.toUpperCase()}
                      </Badge>
                      {offer.settlement_status === "queued" && (
                        <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                          <FileCheck2 className="mr-1 h-3 w-3 inline" />
                          In Settlement Queue
                        </Badge>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Total: {formatAmount(offer.total_offer_amount)} XLM</span>
                      <span>Fair Value: {formatAmount(offer.fair_value_per_fraction)} XLM</span>
                      <span className={offer.discount_premium_percent < 0 ? "text-emerald-600 font-medium" : ""}>
                        {offer.discount_premium_percent < 0
                          ? `${Math.abs(offer.discount_premium_percent)}% discount`
                          : `${offer.discount_premium_percent}% premium`}
                      </span>
                      <span>Yield: {offer.effective_yield_percent}%</span>
                    </div>

                    <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span data-testid={`offer-expiry-${offer.id}`}>
                        {expired
                          ? `Expired on ${formatDate(offer.expires_at)}`
                          : `Expires on ${formatDate(offer.expires_at)}`}
                      </span>
                    </div>
                  </div>

                  {/* Actions for Seller (Incoming) */}
                  {acceptCheck.canAct && !expired && (
                    <div className="flex items-center gap-1.5" data-testid={`seller-actions-${offer.id}`}>
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleAccept(offer.id)}
                        disabled={acceptMutation.isPending}
                        data-testid={`accept-offer-btn-${offer.id}`}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-destructive hover:bg-destructive/10"
                        onClick={() => setRejectingOfferId(offer.id)}
                        disabled={rejectMutation.isPending}
                        data-testid={`reject-offer-btn-${offer.id}`}
                      >
                        Reject
                      </Button>
                    </div>
                  )}

                  {/* Actions for Buyer (Outgoing) */}
                  {cancelCheck.canCancel && !expired && (
                    <div data-testid={`buyer-actions-${offer.id}`}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-destructive hover:bg-destructive/10"
                        onClick={() => handleCancel(offer.id)}
                        disabled={cancelMutation.isPending}
                        data-testid={`cancel-offer-btn-${offer.id}`}
                      >
                        Cancel Offer
                      </Button>
                    </div>
                  )}
                </div>

                {/* Rejection reason dialog */}
                {rejectingOfferId === offer.id && (
                  <div
                    className="mt-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs space-y-2"
                    data-testid={`reject-modal-${offer.id}`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span>Decline Offer Terms</span>
                    </div>
                    <Input
                      placeholder="Optional reason (e.g. Price below minimum expectations)"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="text-xs h-8"
                      data-testid={`rejection-reason-input-${offer.id}`}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 text-xs"
                        onClick={() => handleConfirmReject(offer.id)}
                        disabled={rejectMutation.isPending}
                        data-testid={`confirm-reject-btn-${offer.id}`}
                      >
                        Confirm Rejection
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => setRejectingOfferId(null)}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                )}

                {/* Audit details for terminal offers */}
                {offer.status === "rejected" && offer.rejection_reason && (
                  <div
                    className="rounded bg-muted/40 p-2 text-xs text-muted-foreground"
                    data-testid={`audit-rejected-${offer.id}`}
                  >
                    Rejected: {offer.rejection_reason}
                  </div>
                )}

                {offer.status === "cancelled" && (
                  <div
                    className="rounded bg-muted/40 p-2 text-xs text-muted-foreground"
                    data-testid={`audit-cancelled-${offer.id}`}
                  >
                    Cancelled by buyer on {offer.cancelled_at ? formatDate(offer.cancelled_at) : "N/A"}
                  </div>
                )}

                {expired && (
                  <div
                    className="rounded bg-destructive/10 p-2 text-xs text-destructive"
                    data-testid={`audit-expired-${offer.id}`}
                  >
                    Offer has expired. No further execution or acceptance can take place.
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── Main Panel ─────────────────────────────────────────────────────────────

interface OfferNegotiationPanelProps {
  invoiceId: string;
  walletAddress: string | null | undefined;
  activeListing?: ListingReference | null;
  offersOverride?: SecondaryOffer[];
}

export function OfferNegotiationPanel({
  invoiceId,
  walletAddress,
  activeListing,
  offersOverride,
}: OfferNegotiationPanelProps) {
  return (
    <div className="space-y-6" data-testid="offer-negotiation-panel">
      {/* Builder section */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Make a binding offer
        </h3>
        {!walletAddress ? (
          <p className="text-sm text-muted-foreground" data-testid="offer-connect-prompt">
            Connect a wallet to negotiate and place binding offers.
          </p>
        ) : !activeListing ? (
          <p className="text-sm text-muted-foreground" data-testid="offer-no-listing-prompt">
            Select a secondary market listing to make an offer.
          </p>
        ) : (
          <OfferBuilder
            invoiceId={invoiceId}
            walletAddress={walletAddress}
            activeListing={activeListing}
          />
        )}
      </div>

      <Separator />

      {/* Inbox section */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Offer negotiation inbox
        </h3>
        <OfferInbox
          invoiceId={invoiceId}
          walletAddress={walletAddress}
          offersOverride={offersOverride}
        />
      </div>
    </div>
  );
}
