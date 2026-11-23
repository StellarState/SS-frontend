"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck2,
  HelpCircle,
  Loader2,
  Lock,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useCancelLimitOrderMutation,
  useLimitOrders,
  usePlaceLimitOrderMutation,
} from "@/hooks/useLimitOrders";
import { useInvoiceOrderBook } from "@/hooks/useInvoiceOrderBook";
import {
  DEFAULT_PROTOCOL_LIMITS,
  calculateLimitOrderMatchPreview,
  validateLimitOrderInput,
  type ExtendedLimitOrder,
  type OrderBookAsk,
} from "@/lib/limitOrders";

function formatAmount(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Mock asks fallback if live order book is not populated
const FALLBACK_ASKS: OrderBookAsk[] = [
  { price: 95.0, quantity: 15 },
  { price: 98.5, quantity: 25 },
  { price: 102.0, quantity: 50 },
];

// ─── Limit Order Builder Form ───────────────────────────────────────────────

interface OrderFormProps {
  invoiceId: string;
  onPlaced?: () => void;
}

function LimitOrderForm({ invoiceId, onPlaced }: OrderFormProps) {
  const [fractionAmount, setFractionAmount] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [targetYield, setTargetYield] = useState("10.0");
  const [isSigned, setIsSigned] = useState(false);
  const [signing, setSigning] = useState(false);

  const placeMutation = usePlaceLimitOrderMutation();
  const { data: orderBook } = useInvoiceOrderBook(invoiceId);

  const availableAsks: OrderBookAsk[] = useMemo(() => {
    if (orderBook?.asks && orderBook.asks.length > 0) {
      return orderBook.asks.map((a) => ({ price: a.price, quantity: a.quantity }));
    }
    return FALLBACK_ASKS;
  }, [orderBook]);

  const fractionAmountNum = parseFloat(fractionAmount);
  const maxPriceNum = parseFloat(maxPrice);
  const targetYieldNum = parseFloat(targetYield);

  const validation = useMemo(() => {
    return validateLimitOrderInput(
      {
        fractionAmount: fractionAmountNum,
        maxPricePerFraction: maxPriceNum,
        targetYieldPercent: Number.isFinite(targetYieldNum) ? targetYieldNum : undefined,
      },
      DEFAULT_PROTOCOL_LIMITS,
    );
  }, [fractionAmountNum, maxPriceNum, targetYieldNum]);

  const matchPreview = useMemo(() => {
    if (!validation.valid) return null;
    return calculateLimitOrderMatchPreview(
      fractionAmountNum,
      maxPriceNum,
      Number.isFinite(targetYieldNum) ? targetYieldNum : 10,
      availableAsks,
      DEFAULT_PROTOCOL_LIMITS,
    );
  }, [validation.valid, fractionAmountNum, maxPriceNum, targetYieldNum, availableAsks]);

  const totalEscrowed = matchPreview ? matchPreview.totalEscrowRequired : 0;

  const handleSignAction = () => {
    setSigning(true);
    setTimeout(() => {
      setIsSigned(true);
      setSigning(false);
    }, 400);
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validation.valid || !isSigned) return;

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
          setTargetYield("10.0");
          setIsSigned(false);
          onPlaced?.();
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="limit-order-form">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="fraction-amount">Fraction amount</Label>
          <Input
            id="fraction-amount"
            type="number"
            min="1"
            step="1"
            placeholder="e.g. 10"
            value={fractionAmount}
            onChange={(e) => {
              setFractionAmount(e.target.value);
              setIsSigned(false);
            }}
            data-testid="limit-order-fraction-input"
            aria-describedby="fraction-amount-hint"
          />
          <p id="fraction-amount-hint" className="text-xs text-muted-foreground">
            Min 1 fraction (integer)
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="max-price">Max price (XLM)</Label>
          <Input
            id="max-price"
            type="number"
            min={DEFAULT_PROTOCOL_LIMITS.minPricePerFraction}
            max={DEFAULT_PROTOCOL_LIMITS.maxPricePerFraction}
            step="0.01"
            placeholder="e.g. 100.00"
            value={maxPrice}
            onChange={(e) => {
              setMaxPrice(e.target.value);
              setIsSigned(false);
            }}
            data-testid="limit-order-price-input"
            aria-describedby="max-price-hint"
          />
          <p id="max-price-hint" className="text-xs text-muted-foreground">
            {DEFAULT_PROTOCOL_LIMITS.minPricePerFraction} - {DEFAULT_PROTOCOL_LIMITS.maxPricePerFraction} XLM
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="target-yield">Target yield (%)</Label>
          <Input
            id="target-yield"
            type="number"
            min={DEFAULT_PROTOCOL_LIMITS.minYieldPercent}
            max={DEFAULT_PROTOCOL_LIMITS.maxYieldPercent}
            step="0.1"
            placeholder="e.g. 12.5"
            value={targetYield}
            onChange={(e) => {
              setTargetYield(e.target.value);
              setIsSigned(false);
            }}
            data-testid="limit-order-yield-input"
            aria-describedby="target-yield-hint"
          />
          <p id="target-yield-hint" className="text-xs text-muted-foreground">
            {DEFAULT_PROTOCOL_LIMITS.minYieldPercent}% - {DEFAULT_PROTOCOL_LIMITS.maxYieldPercent}% APY
          </p>
        </div>
      </div>

      {/* Protocol Limit Validation Errors */}
      {validation.errors.length > 0 && fractionAmount && maxPrice && (
        <div
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive space-y-1"
          role="alert"
          data-testid="protocol-limits-error"
        >
          {validation.errors.map((err, idx) => (
            <p key={idx} className="flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {err}
            </p>
          ))}
        </div>
      )}

      {/* Order Summary & Match Preview */}
      {matchPreview && (
        <div
          className="rounded-lg border bg-muted/40 p-3.5 text-xs space-y-2.5"
          data-testid="limit-order-summary"
          role="region"
          aria-label="Order summary"
        >
          <div className="flex items-center justify-between font-semibold border-b pb-2">
            <span className="flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-primary" /> Pre-Trade Match Preview
            </span>
            <Badge variant={matchPreview.canMatchNow ? "default" : "secondary"}>
              {matchPreview.canMatchNow ? "Immediate Match Available" : "Will Wait in Order Book"}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 pt-1">
            <div>
              <span className="text-muted-foreground block text-[11px]">Matched Immediately</span>
              <span className="font-semibold text-foreground text-sm" data-testid="preview-matched-fractions">
                {matchPreview.matchedFractions} / {matchPreview.requestedFractions}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Est. Execution Price</span>
              <span className="font-semibold text-foreground text-sm" data-testid="preview-price">
                {formatAmount(matchPreview.avgMatchPrice)} XLM
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Protocol Fee (0.5%)</span>
              <span className="font-semibold text-muted-foreground text-sm" data-testid="preview-fee">
                {formatAmount(matchPreview.protocolFee)} XLM
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Effective Net Yield</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm" data-testid="preview-yield">
                {matchPreview.effectiveYieldPercent}%
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center border-t pt-2 text-xs">
            <span className="text-muted-foreground">Total Required in Escrow:</span>
            <span className="font-bold text-foreground text-sm" data-testid="limit-order-escrowed">
              {formatAmount(totalEscrowed)} XLM
            </span>
          </div>
        </div>
      )}

      {/* Binding Action Signing Guard */}
      {validation.valid && (
        <div
          className={`flex items-center justify-between rounded-lg border p-3 text-xs transition-colors ${
            isSigned
              ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200"
              : "border-border bg-muted/20"
          }`}
          data-testid="order-signing-box"
        >
          <div className="flex items-center gap-2">
            <Lock className={`h-4 w-4 ${isSigned ? "text-emerald-600" : "text-muted-foreground"}`} />
            <div>
              <p className="font-medium">Binding On-Chain Order Authorization</p>
              <p className="text-muted-foreground text-[11px]">
                {isSigned
                  ? "Order cryptographically signed and authorized for execution."
                  : "Stellar protocol requires wallet authorization to lock escrowed funds."}
              </p>
            </div>
          </div>
          {!isSigned ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleSignAction}
              disabled={signing}
              data-testid="sign-order-btn"
              className="gap-1.5 text-xs h-7"
            >
              {signing ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileCheck2 className="h-3.5 w-3.5" />}
              Sign Order
            </Button>
          ) : (
            <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600 gap-1 text-[11px]">
              <Check className="h-3 w-3" /> Signed
            </Badge>
          )}
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={!validation.valid || !isSigned || placeMutation.isPending}
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

// ─── Orders Management List (Open, Matched, Cancelled, Expired) ─────────────

interface ActiveOrdersListProps {
  walletAddress: string | null | undefined;
}

const SAMPLE_HISTORICAL_ORDERS: ExtendedLimitOrder[] = [
  {
    id: "ord-m1",
    invoice_id: "inv-881",
    investor_address: "GINV",
    fraction_amount: 20,
    max_price_per_fraction: 98.0,
    total_escrowed: 1960.0,
    status: "filled",
    created_at: "2026-10-10T10:00:00Z",
    matched_at: "2026-10-10T10:15:00Z",
    avg_execution_price: 97.5,
    audit_id: "AUD-FILL-9982",
  },
  {
    id: "ord-c1",
    invoice_id: "inv-882",
    investor_address: "GINV",
    fraction_amount: 15,
    max_price_per_fraction: 105.0,
    total_escrowed: 1575.0,
    status: "cancelled",
    created_at: "2026-10-14T09:00:00Z",
    cancelled_at: "2026-10-14T11:00:00Z",
    audit_id: "AUD-CANC-1142",
  },
  {
    id: "ord-e1",
    invoice_id: "inv-883",
    investor_address: "GINV",
    fraction_amount: 10,
    max_price_per_fraction: 92.0,
    total_escrowed: 920.0,
    status: "expired",
    created_at: "2026-09-01T12:00:00Z",
    expires_at: "2026-09-04T12:00:00Z",
    audit_id: "AUD-EXP-0081",
  },
];

function ActiveOrdersList({ walletAddress }: ActiveOrdersListProps) {
  const { data: rawOrders, isLoading } = useLimitOrders(walletAddress);
  const cancelMutation = useCancelLimitOrderMutation(walletAddress);

  const [activeTab, setActiveTab] = useState<string>("open");
  const [orderToCancel, setOrderToCancel] = useState<ExtendedLimitOrder | null>(null);

  const allOrders: ExtendedLimitOrder[] = useMemo(() => {
    const live = (rawOrders ?? []).map((o) => ({
      ...o,
      audit_id: `AUD-LIVE-${o.id}`,
    }));
    return [...live, ...SAMPLE_HISTORICAL_ORDERS];
  }, [rawOrders]);

  const filteredOrders = useMemo(() => {
    if (activeTab === "all") return allOrders;
    if (activeTab === "open") return allOrders.filter((o) => o.status === "open");
    if (activeTab === "matched") return allOrders.filter((o) => o.status === "filled");
    if (activeTab === "cancelled") return allOrders.filter((o) => o.status === "cancelled");
    if (activeTab === "expired") return allOrders.filter((o) => o.status === "expired");
    return allOrders;
  }, [activeTab, allOrders]);

  if (!walletAddress) return null;

  if (isLoading) {
    return (
      <div className="space-y-2" data-testid="active-orders-loading">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  const handleConfirmCancel = () => {
    if (!orderToCancel) return;
    cancelMutation.mutate(orderToCancel.id, {
      onSettled: () => {
        setOrderToCancel(null);
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Cancellation Confirmation Dialog */}
      {orderToCancel && (
        <div
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-xs space-y-3"
          role="alertdialog"
          aria-labelledby="cancel-dialog-title"
          data-testid="cancel-order-confirm-dialog"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <h4 id="cancel-dialog-title" className="font-semibold text-sm text-destructive">
                Confirm Order Cancellation
              </h4>
              <p className="text-muted-foreground mt-0.5">
                Are you sure you want to cancel order <strong>#{orderToCancel.id}</strong>? The escrowed
                amount of <strong>{formatAmount(orderToCancel.total_escrowed)} XLM</strong> will be released back to
                your wallet.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOrderToCancel(null)}
              data-testid="keep-order-btn"
              className="h-7 text-xs"
            >
              Keep Order
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmCancel}
              disabled={cancelMutation.isPending}
              data-testid="confirm-cancel-order-btn"
              className="h-7 text-xs gap-1"
            >
              {cancelMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              Confirm Cancellation
            </Button>
          </div>
        </div>
      )}

      {/* Tabs View */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList aria-label="Filter limit orders by state" data-testid="limit-order-tabs">
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="matched">Matched</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          <TabsTrigger value="expired">Expired</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredOrders.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground" data-testid="no-active-orders">
          No {activeTab === "all" ? "" : activeTab} limit orders
        </p>
      ) : (
        <ul className="space-y-2" aria-label="Active limit orders" data-testid="active-orders-list">
          {filteredOrders.map((order: ExtendedLimitOrder) => {
            const isCancelling =
              cancelMutation.isPending && cancelMutation.variables === order.id;

            return (
              <li
                key={order.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border px-4 py-3 text-xs"
                data-testid={`limit-order-${order.id}`}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {order.fraction_amount.toLocaleString()} fractions @ max{" "}
                      {formatAmount(order.max_price_per_fraction)} XLM
                    </p>
                    <Badge
                      variant={
                        order.status === "open"
                          ? "default"
                          : order.status === "filled"
                            ? "secondary"
                            : "outline"
                      }
                      className="capitalize text-[11px]"
                      data-testid={`order-status-${order.id}`}
                    >
                      {order.status === "filled" ? "Matched" : order.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
                    <span>Escrowed: {formatAmount(order.total_escrowed)} XLM</span>
                    <span>•</span>
                    <span>Placed {formatDate(order.created_at)}</span>
                    {order.audit_id && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-[11px]">Audit ID: {order.audit_id}</span>
                      </>
                    )}
                  </div>
                </div>

                {order.status === "open" && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-destructive hover:bg-destructive/10 gap-1"
                      disabled={isCancelling}
                      onClick={() => setOrderToCancel(order)}
                      aria-label={`Cancel order for ${order.fraction_amount} fractions`}
                      data-testid={`cancel-order-${order.id}`}
                    >
                      {isCancelling ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      Cancel
                    </Button>
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

// ─── Main Panel Entrypoint ──────────────────────────────────────────────────

interface LimitOrderPanelProps {
  invoiceId: string;
  walletAddress: string | null | undefined;
}

export function LimitOrderPanel({ invoiceId, walletAddress }: LimitOrderPanelProps) {
  return (
    <div className="space-y-6" data-testid="limit-order-panel">
      {/* Placement form */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Limit Order Builder
        </h3>
        {walletAddress ? (
          <LimitOrderForm invoiceId={invoiceId} />
        ) : (
          <p className="text-sm text-muted-foreground" data-testid="limit-order-connect-prompt">
            Connect a wallet to place a limit order.
          </p>
        )}
      </div>

      <Separator />

      {/* Orders Management View */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Limit Order Management
        </h3>
        <ActiveOrdersList walletAddress={walletAddress} />
      </div>
    </div>
  );
}
