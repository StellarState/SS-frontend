"use client";

/**
 * Collateral health and top-up workflow panel (#683).
 *
 * Implements collateral health valuation models, live requirement/buffer metrics,
 * prominent critical state warnings, live action preview reconciliations,
 * withdrawal blocking guards, and audit history.
 */

import { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  Sparkles,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  previewCollateralAction,
  type CollateralPosition,
  type CollateralActionHistory,
  type ValuationModel,
  type CollateralActionType,
  MIN_COLLATERAL_RATIO_PERCENT,
  LIQUIDATION_THRESHOLD_PERCENT,
  WARNING_THRESHOLD_PERCENT,
} from "@/lib/analytics/collateralHealth";
import {
  useCollateralPosition,
  useCollateralHistory,
  useTopUpCollateralMutation,
  useWithdrawCollateralMutation,
} from "@/hooks/useCollateralHealth";

function formatAmount(n: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
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

// ─── Main Panel ─────────────────────────────────────────────────────────────

interface CollateralHealthPanelProps {
  invoiceId: string;
  walletAddress: string | null | undefined;
  positionOverride?: CollateralPosition;
  historyOverride?: CollateralActionHistory[];
}

export function CollateralHealthPanel({
  invoiceId,
  walletAddress,
  positionOverride,
  historyOverride,
}: CollateralHealthPanelProps) {
  const [valuationModel, setValuationModel] = useState<ValuationModel>("mark_to_market");
  const { data: fetchedPosition, isLoading: isPositionLoading } = useCollateralPosition(
    invoiceId,
    valuationModel,
  );
  const { data: fetchedHistory } = useCollateralHistory(invoiceId);

  const position = positionOverride ?? fetchedPosition;
  const history = historyOverride ?? fetchedHistory ?? [];

  const [actionTab, setActionTab] = useState<CollateralActionType>("top_up");
  const [amountInput, setAmountInput] = useState("");
  const [sourceAddress, setSourceAddress] = useState("Connected Stellar Wallet");

  const topUpMutation = useTopUpCollateralMutation(invoiceId);
  const withdrawMutation = useWithdrawCollateralMutation(invoiceId);

  if (isPositionLoading && !positionOverride) {
    return (
      <Card data-testid="collateral-loading">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Loading collateral health metrics...
        </CardContent>
      </Card>
    );
  }

  if (!position) {
    return (
      <Card data-testid="collateral-unavailable">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No collateral position found for this invoice.
        </CardContent>
      </Card>
    );
  }

  const amountNum = parseFloat(amountInput) || 0;
  const preview = previewCollateralAction(position, actionTab, amountNum);

  const handleActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview.canExecute || amountNum <= 0) return;

    if (actionTab === "top_up") {
      topUpMutation.mutate(
        { amount: amountNum, sourceAddress },
        { onSuccess: () => setAmountInput("") },
      );
    } else {
      withdrawMutation.mutate(
        { amount: amountNum, destinationAddress: walletAddress ?? "GBWITHDRAW_DEST" },
        { onSuccess: () => setAmountInput("") },
      );
    }
  };

  return (
    <Card className="space-y-6 p-6" data-testid="collateral-health-panel">
      {/* Header and Valuation Model Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight">Collateral Health & Top-Up</h2>
            <Badge
              variant={
                position.health_status === "healthy"
                  ? "default"
                  : position.health_status === "warning"
                    ? "secondary"
                    : "destructive"
              }
              data-testid="health-status-badge"
            >
              {position.health_status.toUpperCase()} ({position.current_health_ratio_percent}%)
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Minimum required ratio: {MIN_COLLATERAL_RATIO_PERCENT}% · Liquidation threshold:{" "}
            {LIQUIDATION_THRESHOLD_PERCENT}%
          </p>
        </div>

        {/* Valuation Model Selector */}
        <div className="flex items-center gap-2 text-xs" data-testid="valuation-model-toggle">
          <span className="text-muted-foreground">Valuation Model:</span>
          <div className="flex rounded-md border p-0.5 bg-muted/30">
            <button
              type="button"
              onClick={() => setValuationModel("mark_to_market")}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                valuationModel === "mark_to_market"
                  ? "bg-background shadow font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="model-btn-mark-to-market"
            >
              Mark-to-Market
            </button>
            <button
              type="button"
              onClick={() => setValuationModel("haircut_adjusted")}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                valuationModel === "haircut_adjusted"
                  ? "bg-background shadow font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="model-btn-haircut"
            >
              Haircut Adjusted ({position.haircut_percent}%)
            </button>
          </div>
        </div>
      </div>

      {/* Prominent Critical Liquidation Warning */}
      {position.health_status === "critical" && (
        <div
          className="rounded-lg border border-destructive bg-destructive/15 p-4 text-xs space-y-1 text-destructive flex items-start gap-3"
          data-testid="critical-state-banner"
          role="alert"
        >
          <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">CRITICAL COLLATERAL LEVEL: LIQUIDATION IMMINENT</h4>
            <p className="text-xs leading-normal">
              Your collateral health ratio ({position.current_health_ratio_percent}%) is at or below the{" "}
              {LIQUIDATION_THRESHOLD_PERCENT}% liquidation threshold. Withdrawals are completely disabled.
              Please deposit a top-up immediately to prevent liquidation.
            </p>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-lg bg-muted/40 p-4 text-xs"
        data-testid="collateral-metrics-grid"
      >
        <div>
          <span className="text-muted-foreground block">Outstanding Debt</span>
          <span className="text-base font-semibold text-foreground" data-testid="metric-outstanding-debt">
            {formatAmount(position.outstanding_debt_xlm)} XLM
          </span>
        </div>
        <div>
          <span className="text-muted-foreground block">Deposited Collateral</span>
          <span className="text-base font-semibold text-foreground" data-testid="metric-deposited-collateral">
            {formatAmount(position.current_collateral_xlm)} XLM
          </span>
        </div>
        <div>
          <span className="text-muted-foreground block">Required Minimum (120%)</span>
          <span className="text-base font-semibold text-foreground" data-testid="metric-required-collateral">
            {formatAmount(position.required_collateral_value)} XLM
          </span>
        </div>
        <div>
          <span className="text-muted-foreground block">Collateral Buffer</span>
          <span
            className={`text-base font-semibold ${
              position.buffer_amount_xlm >= 0 ? "text-emerald-600" : "text-destructive"
            }`}
            data-testid="metric-buffer-amount"
          >
            {position.buffer_amount_xlm >= 0 ? "+" : ""}
            {formatAmount(position.buffer_amount_xlm)} XLM
          </span>
        </div>
      </div>

      {/* Top-up & Withdrawal Action Box */}
      <div className="space-y-4">
        {/* Action Tabs */}
        <div className="flex gap-2 border-b pb-2 text-xs" data-testid="collateral-action-tabs">
          <button
            type="button"
            onClick={() => {
              setActionTab("top_up");
              setAmountInput("");
            }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              actionTab === "top_up"
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground hover:bg-muted"
            }`}
            data-testid="tab-top-up"
          >
            Top-Up Collateral
          </button>
          <button
            type="button"
            onClick={() => {
              setActionTab("withdrawal");
              setAmountInput("");
            }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              actionTab === "withdrawal"
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground hover:bg-muted"
            }`}
            data-testid="tab-withdrawal"
          >
            Withdraw Excess Collateral
          </button>
        </div>

        <form onSubmit={handleActionSubmit} className="space-y-4" data-testid="collateral-action-form">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="action-amount">
                {actionTab === "top_up" ? "Top-Up Amount (XLM)" : "Withdrawal Amount (XLM)"}
              </Label>
              <Input
                id="action-amount"
                type="number"
                min="1"
                step="0.01"
                placeholder="e.g. 10000"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="text-xs"
                data-testid="action-amount-input"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="action-source">
                {actionTab === "top_up" ? "Funding Source" : "Destination Wallet"}
              </Label>
              <select
                id="action-source"
                value={sourceAddress}
                onChange={(e) => setSourceAddress(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                data-testid="action-source-select"
              >
                <option value="Connected Stellar Wallet">Connected Stellar Wallet</option>
                <option value="Stellar Primary Anchor">Stellar Primary Anchor</option>
                <option value="Treasury Reserve Balance">Treasury Reserve Balance</option>
              </select>
            </div>
          </div>

          {/* Real-Time Preview Box */}
          {amountNum > 0 && (
            <div
              className={`rounded-lg border p-3.5 text-xs space-y-2 ${
                preview.canExecute
                  ? "border-primary/30 bg-primary/5"
                  : "border-destructive/40 bg-destructive/5 text-destructive"
              }`}
              data-testid="collateral-action-preview"
              role="region"
              aria-label="Resulting health preview"
            >
              <div className="flex items-center justify-between font-semibold">
                <span className="flex items-center gap-1.5 text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Resulting Position Preview</span>
                </span>
                <Badge
                  variant={
                    preview.resultingStatus === "healthy"
                      ? "default"
                      : preview.resultingStatus === "warning"
                        ? "secondary"
                        : "destructive"
                  }
                  data-testid="preview-resulting-status"
                >
                  {preview.resultingStatus.toUpperCase()} ({preview.resultingRatioPercent}%)
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-muted-foreground">
                <div>
                  <span>Resulting Collateral:</span>{" "}
                  <span className="font-semibold text-foreground" data-testid="preview-resulting-collateral">
                    {formatAmount(preview.resultingCollateral)} XLM
                  </span>
                </div>
                <div>
                  <span>Resulting Buffer:</span>{" "}
                  <span
                    className={`font-semibold ${
                      preview.resultingBuffer >= 0 ? "text-emerald-600" : "text-destructive"
                    }`}
                    data-testid="preview-resulting-buffer"
                  >
                    {preview.resultingBuffer >= 0 ? "+" : ""}
                    {formatAmount(preview.resultingBuffer)} XLM
                  </span>
                </div>
                <div>
                  <span>Resulting Health Ratio:</span>{" "}
                  <span className="font-semibold text-foreground" data-testid="preview-resulting-ratio">
                    {preview.resultingRatioPercent}%
                  </span>
                </div>
              </div>

              {!preview.canExecute && preview.blockReason && (
                <div
                  className="rounded bg-destructive/10 p-2 text-[11px] font-medium text-destructive mt-1"
                  data-testid="preview-block-error"
                >
                  {preview.blockReason}
                </div>
              )}
            </div>
          )}

          <Button
            type="submit"
            disabled={!preview.canExecute || amountNum <= 0 || topUpMutation.isPending || withdrawMutation.isPending}
            className={`w-full text-xs ${
              actionTab === "top_up"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-primary hover:bg-primary/90"
            }`}
            data-testid="submit-action-btn"
          >
            {(topUpMutation.isPending || withdrawMutation.isPending) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {actionTab === "top_up" ? "Execute Collateral Top-Up" : "Execute Collateral Withdrawal"}
          </Button>
        </form>
      </div>

      <Separator />

      {/* Action History List */}
      <div className="space-y-3" data-testid="collateral-history-section">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Collateral Modification History
        </h4>
        {history.length === 0 ? (
          <p className="py-2 text-xs text-muted-foreground">No recent collateral actions recorded.</p>
        ) : (
          <ul className="space-y-2" data-testid="history-list">
            {history.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded border bg-muted/10 p-2.5 text-xs"
                data-testid={`history-item-${item.id}`}
              >
                <div className="flex items-center gap-2">
                  {item.type === "top_up" ? (
                    <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4 text-amber-600" />
                  )}
                  <div>
                    <span className="font-semibold text-foreground capitalize">
                      {item.type === "top_up" ? "Top-Up: +" : "Withdrawal: -"}
                      {formatAmount(item.amount_xlm)} XLM
                    </span>
                    <span className="text-muted-foreground block text-[11px]">
                      Source/Dest: {item.source_or_destination}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-muted-foreground block text-[11px]">
                    Ratio: {item.previous_ratio_percent}% →{" "}
                    <strong className="text-foreground">{item.resulting_ratio_percent}%</strong>
                  </span>
                  <span className="text-[10px] text-muted-foreground">{formatDate(item.timestamp)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
