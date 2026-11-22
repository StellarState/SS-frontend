"use client";

/**
 * Price and yield limit order management (#480, #688)
 *
 * Provides a protocol-validated limit-order builder, match preview before execution,
 * multi-view status filtering (open, matched, cancelled, expired), confirmation
 * dialog for cancellations, and auditability for terminal orders.
 */

import { useState } from "react";
import { Loader2, X, AlertCircle, Sparkles, CheckCircle2, Clock, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  useCancelLimitOrderMutation,
  useLimitOrders,
  usePlaceLimitOrderMutation,
} from "@/hooks/useLimitOrders";
import {
  validateLimitOrderInput,
  calculateOrderMatchPreview,
  canExecuteOrder,
  isOrderExpired,
  filterOrdersByView,
  type ExtendedLimitOrder,
  type LimitOrderViewFilter,
  type ActiveListingCandidate,
  MIN_LIMIT_PRICE_XLM,
  MAX_LIMIT_PRICE_XLM,
  MIN_TARGET_YIELD_PERCENT,
  MAX_TARGET_YIELD_PERCENT,
} from "@/lib/analytics/limitOrders";
import type { LimitOrder } from "@/lib/api";

function formatAmount(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Order form ─────────────────────────────────────────────────────────────

interface OrderFormProps {
  invoiceId: string;
  candidateListing?: ActiveListingCandidate | null;
  onPlaced?: () => void;
}

export function LimitOrderForm({ invoiceId, candidateListing, onPlaced }: OrderFormProps) {
  const [fractionAmount, setFractionAmount] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [targetYield, setTargetYield] = useState("");
  const [expiryDays, setExpiryDays] = useState("30");
  const [showPreview, setShowPreview] = useState(true);

  const placeMutation = usePlaceLimitOrderMutation();

  const fractionAmountNum = parseFloat(fractionAmount);
  const maxPriceNum = parseFloat(maxPrice);
  const targetYieldNum = targetYield ? parseFloat(targetYield) : null;
  const expiryDaysNum = parseInt(expiryDays, 10) || 30;

  // Protocol limit validation
  const validation = validateLimitOrderInput({
    fraction_amount: fractionAmountNum,
    max_price_per_fraction: maxPriceNum,
    target_yield_percent: targetYieldNum,
    expires_in_days: expiryDaysNum,
  });

  const isFormValid = validation.isValid;
  const totalEscrowed = isFormValid ? fractionAmountNum * maxPriceNum : 0;

  // Match Preview
  const matchPreview = isFormValid
    ? calculateOrderMatchPreview(
        {
          fraction_amount: fractionAmountNum,
          max_price_per_fraction: maxPriceNum,
          target_yield_percent: targetYieldNum,
        },
        candidateListing,
      )
    : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isFormValid) return;

    placeMutation.mutate(
      {
        invoice_id: invoiceId,
        fraction_amount: fractionAmountNum,
        max_price_per_fraction: maxPriceNum,
      },
      {
        onSuccess: () => {
          setFractionAmount("");
          setMaxPrice("");
          setTargetYield("");
          onPlaced?.();
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="limit-order-form">
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Fraction amount */}
        <div className="space-y-1.5">
          <Label htmlFor="fraction-amount">Fraction amount</Label>
          <Input
            id="fraction-amount"
            type="number"
            min="1"
            step="1"
            placeholder="e.g. 10"
            value={fractionAmount}
            onChange={(e) => setFractionAmount(e.target.value)}
            data-testid="limit-order-fraction-input"
            aria-describedby="fraction-amount-hint"
          />
          {validation.errors.fraction_amount ? (
            <p className="text-xs text-destructive" data-testid="error-fraction-amount">
              {validation.errors.fraction_amount}
            </p>
          ) : (
            <p id="fraction-amount-hint" className="text-xs text-muted-foreground">
              Number of fractions to buy (integer)
            </p>
          )}
        </div>

        {/* Max price per fraction */}
        <div className="space-y-1.5">
          <Label htmlFor="max-price">Max price per fraction (XLM)</Label>
          <Input
            id="max-price"
            type="number"
            min={MIN_LIMIT_PRICE_XLM}
            max={MAX_LIMIT_PRICE_XLM}
            step="0.0001"
            placeholder="e.g. 105.00"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            data-testid="limit-order-price-input"
            aria-describedby="max-price-hint"
          />
          {validation.errors.max_price_per_fraction ? (
            <p className="text-xs text-destructive" data-testid="error-max-price">
              {validation.errors.max_price_per_fraction}
            </p>
          ) : (
            <p id="max-price-hint" className="text-xs text-muted-foreground">
              Protocol limits: {MIN_LIMIT_PRICE_XLM} - {MAX_LIMIT_PRICE_XLM.toLocaleString("en-US")} XLM
            </p>
          )}
        </div>

        {/* Target Yield */}
        <div className="space-y-1.5">
          <Label htmlFor="target-yield">Target Yield % (Optional)</Label>
          <Input
            id="target-yield"
            type="number"
            min={MIN_TARGET_YIELD_PERCENT}
            max={MAX_TARGET_YIELD_PERCENT}
            step="0.1"
            placeholder="e.g. 12.0"
            value={targetYield}
            onChange={(e) => setTargetYield(e.target.value)}
            data-testid="limit-order-yield-input"
            aria-describedby="target-yield-hint"
          />
          {validation.errors.target_yield_percent ? (
            <p className="text-xs text-destructive" data-testid="error-target-yield">
              {validation.errors.target_yield_percent}
            </p>
          ) : (
            <p id="target-yield-hint" className="text-xs text-muted-foreground">
              Allowed yield: {MIN_TARGET_YIELD_PERCENT}% - {MAX_TARGET_YIELD_PERCENT}%
            </p>
          )}
        </div>

        {/* Expiry Duration */}
        <div className="space-y-1.5">
          <Label htmlFor="expiry-days">Expiry Duration</Label>
          <select
            id="expiry-days"
            value={expiryDays}
            onChange={(e) => setExpiryDays(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            data-testid="limit-order-expiry-select"
          >
            <option value="7">7 Days</option>
            <option value="14">14 Days</option>
            <option value="30">30 Days</option>
            <option value="60">60 Days</option>
            <option value="90">90 Days</option>
          </select>
          <p className="text-xs text-muted-foreground">Unmatched orders expire automatically</p>
        </div>
      </div>

      {/* Match Preview Box (Shows price, fees and yield) */}
      {isFormValid && matchPreview && showPreview && (
        <div
          className="rounded-lg border border-primary/30 bg-primary/5 p-3.5 space-y-2 text-xs"
          data-testid="limit-order-match-preview"
          role="region"
          aria-label="Order match preview"
        >
          <div className="flex items-center justify-between font-semibold text-foreground">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Match Preview</span>
            </span>
            <Badge variant={matchPreview.canMatch ? "default" : "outline"} className="text-[10px]">
              {matchPreview.canMatch ? "MATCH AVAILABLE" : "NO IMMEDIATE MATCH"}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 text-muted-foreground">
            <div>
              <span>Matched Price:</span>{" "}
              <span className="font-semibold text-foreground" data-testid="preview-matched-price">
                {formatAmount(matchPreview.matchedPrice)} XLM
              </span>
            </div>
            <div>
              <span>Est. Protocol Fee (0.50%):</span>{" "}
              <span className="font-semibold text-foreground" data-testid="preview-fee">
                {formatAmount(matchPreview.estimatedFee)} XLM
              </span>
            </div>
            <div>
              <span>Effective Annual Yield:</span>{" "}
              <span className="font-semibold text-foreground" data-testid="preview-effective-yield">
                {matchPreview.effectiveYield.toFixed(2)}%
              </span>
            </div>
            <div>
              <span>Net Total Escrow:</span>{" "}
              <span className="font-semibold text-foreground" data-testid="preview-net-total">
                {formatAmount(matchPreview.netTotal)} XLM
              </span>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground pt-1 border-t border-primary/20">
            {matchPreview.matchStatusMessage}
          </p>
        </div>
      )}

      {/* Basic Escrow summary */}
      {isFormValid && !matchPreview && (
        <div
          className="rounded-lg bg-muted/50 px-4 py-3 text-sm space-y-1"
          data-testid="limit-order-summary"
        >
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total escrowed</span>
            <span className="font-semibold" data-testid="limit-order-escrowed">
              {formatAmount(totalEscrowed)} XLM
            </span>
          </div>
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={!isFormValid || placeMutation.isPending}
        data-testid="place-limit-order-btn"
      >
        {placeMutation.isPending && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
        )}
        Place Limit Order
      </Button>
    </form>
  );
}

// ─── Filterable orders list with Cancellation Confirmation ───────────────────

interface ActiveOrdersListProps {
  walletAddress: string | null | undefined;
  ordersOverride?: ExtendedLimitOrder[];
}

export function ActiveOrdersList({ walletAddress, ordersOverride }: ActiveOrdersListProps) {
  const { data: apiOrders, isLoading } = useLimitOrders(walletAddress);
  const cancelMutation = useCancelLimitOrderMutation(walletAddress);

  const [activeTab, setActiveTab] = useState<LimitOrderViewFilter>("open");
  const [confirmCancelOrderId, setConfirmCancelOrderId] = useState<string | null>(null);

  if (!walletAddress) return null;

  if (isLoading && !ordersOverride) {
    return (
      <div className="space-y-2" data-testid="active-orders-loading">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  // Use override or map apiOrders into extended orders
  const allOrders: ExtendedLimitOrder[] = ordersOverride ?? (apiOrders as unknown as ExtendedLimitOrder[]) ?? [];
  const filteredOrders = filterOrdersByView(allOrders, activeTab);

  const counts = {
    all: allOrders.length,
    open: allOrders.filter((o) => o.status === "open").length,
    matched: allOrders.filter((o) => o.status === "matched").length,
    cancelled: allOrders.filter((o) => o.status === "cancelled").length,
    expired: allOrders.filter((o) => o.status === "expired" || isOrderExpired(o)).length,
  };

  const handleCancelConfirm = (orderId: string) => {
    cancelMutation.mutate(orderId, {
      onSettled: () => setConfirmCancelOrderId(null),
    });
  };

  return (
    <div className="space-y-3" data-testid="orders-manager-section">
      {/* View Tabs */}
      <div className="flex gap-1.5 border-b pb-2 text-xs" data-testid="order-view-tabs">
        {(["open", "matched", "cancelled", "expired", "all"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
              activeTab === tab
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground hover:bg-muted"
            }`}
            data-testid={`tab-${tab}`}
          >
            {tab} ({counts[tab]})
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground" data-testid="no-active-orders">
          No {activeTab} limit orders found.
        </p>
      ) : (
        <ul className="space-y-2" aria-label="Limit orders list" data-testid="active-orders-list">
          {filteredOrders.map((order: ExtendedLimitOrder) => {
            const isCancelling =
              cancelMutation.isPending && cancelMutation.variables === order.id;
            const isConfirming = confirmCancelOrderId === order.id;
            const expired = isOrderExpired(order);

            return (
              <li
                key={order.id}
                className="flex flex-col gap-2 rounded-lg border px-4 py-3"
                data-testid={`limit-order-${order.id}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {order.fraction_amount.toLocaleString()} fractions @ max{" "}
                      {formatAmount(order.max_price_per_fraction)} XLM
                      {order.target_yield_percent && (
                        <span className="text-xs text-muted-foreground ml-2">
                          (Target: {order.target_yield_percent}% yield)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Escrowed: {formatAmount(order.total_escrowed)} XLM · placed{" "}
                      {formatDate(order.created_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        order.status === "matched"
                          ? "default"
                          : order.status === "cancelled"
                            ? "secondary"
                            : expired || order.status === "expired"
                              ? "destructive"
                              : "outline"
                      }
                      data-testid={`order-status-${order.id}`}
                    >
                      {expired && order.status === "open" ? "EXPIRED" : order.status.toUpperCase()}
                    </Badge>

                    {/* Cancel button: Only for active open unexpired orders */}
                    {order.status === "open" && !expired && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                        disabled={isCancelling}
                        onClick={() => setConfirmCancelOrderId(order.id)}
                        aria-label={`Cancel order for ${order.fraction_amount} fractions`}
                        data-testid={`cancel-order-${order.id}`}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Audit details for terminal orders */}
                {order.status === "matched" && (
                  <div
                    className="rounded bg-muted/40 p-2 text-xs text-muted-foreground flex justify-between"
                    data-testid={`audit-matched-${order.id}`}
                  >
                    <span>
                      Matched at {order.matched_at ? formatDate(order.matched_at) : "N/A"} @{" "}
                      {order.matched_price_per_fraction} XLM
                    </span>
                    <span>Fee: {order.execution_fee ?? 0} XLM • Yield: {order.effective_yield}%</span>
                  </div>
                )}

                {order.status === "cancelled" && (
                  <div
                    className="rounded bg-muted/40 p-2 text-xs text-muted-foreground"
                    data-testid={`audit-cancelled-${order.id}`}
                  >
                    Cancelled on {order.cancelled_at ? formatDate(order.cancelled_at) : "N/A"}
                    {order.cancellation_reason && ` • Reason: ${order.cancellation_reason}`}
                  </div>
                )}

                {expired && (
                  <div
                    className="rounded bg-destructive/10 text-destructive p-2 text-xs"
                    data-testid={`audit-expired-${order.id}`}
                  >
                    Order reached expiry date ({formatDate(order.expires_at)}). Execution is blocked.
                  </div>
                )}

                {/* Cancellation Confirmation Box (#688: Require confirmation to cancel) */}
                {isConfirming && (
                  <div
                    className="mt-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs space-y-2"
                    data-testid={`cancel-confirm-box-${order.id}`}
                    role="alertdialog"
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span>Confirm Order Cancellation</span>
                    </div>
                    <p className="text-muted-foreground">
                      Are you sure you want to cancel this order? Escrowed funds ({formatAmount(order.total_escrowed)} XLM) will be refunded to your wallet.
                    </p>
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleCancelConfirm(order.id)}
                        disabled={isCancelling}
                        data-testid={`confirm-cancel-btn-${order.id}`}
                        className="h-7 text-xs"
                      >
                        {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmCancelOrderId(null)}
                        data-testid={`abort-cancel-btn-${order.id}`}
                        className="h-7 text-xs"
                      >
                        Keep Order
                      </Button>
                    </div>
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

// ─── Main panel ─────────────────────────────────────────────────────────────

interface LimitOrderPanelProps {
  invoiceId: string;
  walletAddress: string | null | undefined;
  candidateListing?: ActiveListingCandidate | null;
  ordersOverride?: ExtendedLimitOrder[];
}

export function LimitOrderPanel({
  invoiceId,
  walletAddress,
  candidateListing,
  ordersOverride,
}: LimitOrderPanelProps) {
  return (
    <div className="space-y-6" data-testid="limit-order-panel">
      {/* Placement form */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          New limit order
        </h3>
        {walletAddress ? (
          <LimitOrderForm invoiceId={invoiceId} candidateListing={candidateListing} />
        ) : (
          <p className="text-sm text-muted-foreground" data-testid="limit-order-connect-prompt">
            Connect a wallet to place a limit order.
          </p>
        )}
      </div>

      <Separator />

      {/* Order manager across views */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Limit order management
        </h3>
        <ActiveOrdersList walletAddress={walletAddress} ordersOverride={ordersOverride} />
      </div>
    </div>
  );
}
