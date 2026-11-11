"use client";

import { useMemo, useState } from "react";
import { Info, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Money } from "@/components/currency";
import {
  DEFAULT_FRACTION_PRICE,
  calculateReturns,
  daysUntil,
  parseAmount,
} from "@/lib/returnsCalculator";

export const RETURNS_METHODOLOGY =
  "Your amount buys whole fractions at the current fraction price. Your pro-rata share is the fractions you hold divided by the invoice's total fractions. Projected yield is the amount invested × the effective yield rate × days held ÷ 365, minus platform investment fee deduction.";

export interface ReturnsCalculatorProps {
  faceValue: number;
  yieldPercentage?: number | null;
  maturityDate: string;
  fractionPrice?: number;
  /** Optional dynamic yield percentage from issuer history (#564). */
  dynamicYieldPercentage?: number | null;
  /** Optional investment fee rate percentage (#564). */
  feeRatePercentage?: number | null;
  /** Optional XLM/USD exchange rate (#564). */
  xlmUsdRate?: number | null;
  /** Optional funding cap in XLM (#564). */
  fundingCap?: number | null;
}

export function ReturnsCalculator({
  faceValue,
  yieldPercentage,
  maturityDate,
  fractionPrice = DEFAULT_FRACTION_PRICE,
  dynamicYieldPercentage,
  feeRatePercentage,
  xlmUsdRate,
  fundingCap,
}: ReturnsCalculatorProps) {
  const [raw, setRaw] = useState("");
  const [holdMode, setHoldMode] = useState<"maturity" | "custom">("maturity");
  const [customDate, setCustomDate] = useState("");

  const maxMaturityDays = useMemo(() => daysUntil(maturityDate), [maturityDate]);

  const daysRemaining = useMemo(() => {
    if (holdMode === "maturity") {
      return maxMaturityDays;
    }
    if (!customDate) {
      return maxMaturityDays;
    }
    const customDays = daysUntil(customDate);
    return Math.min(customDays, maxMaturityDays);
  }, [holdMode, customDate, maxMaturityDays]);

  const result = useMemo(() => {
    return calculateReturns({
      amount: parseAmount(raw),
      fractionPrice,
      faceValue,
      yieldPercentage: yieldPercentage ?? 0,
      daysRemaining,
      dynamicYieldPercentage,
      feeRatePercentage,
      xlmUsdRate,
      fundingCap,
    });
  }, [
    raw,
    fractionPrice,
    faceValue,
    yieldPercentage,
    daysRemaining,
    dynamicYieldPercentage,
    feeRatePercentage,
    xlmUsdRate,
    fundingCap,
  ]);

  return (
    <div className="space-y-4 border-t pt-4" data-testid="returns-calculator">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold">Pro-rata returns projection</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="How returns are calculated"
                  data-testid="returns-methodology-trigger"
                  className="text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                >
                  <Info className="h-4 w-4" aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs" data-testid="returns-methodology">
                {RETURNS_METHODOLOGY}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {dynamicYieldPercentage && dynamicYieldPercentage > 0 ? (
          <span
            className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
            data-testid="returns-yield-source"
          >
            Issuer dynamic yield: {dynamicYieldPercentage}%
          </span>
        ) : (
          <span
            className="text-xs font-medium text-muted-foreground bg-muted/40 px-2 py-0.5 rounded"
            data-testid="returns-yield-source"
          >
            Invoice yield: {yieldPercentage ?? 0}%
          </span>
        )}
      </div>

      {/* Amount Input */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs">
          <Label htmlFor="returns-calc-amount">Amount to invest (XLM)</Label>
          {result.remainderAmount > 0 && (
            <span className="text-muted-foreground" data-testid="returns-remainder">
              Remainder: {result.remainderAmount.toFixed(2)} XLM
            </span>
          )}
        </div>
        <Input
          id="returns-calc-amount"
          type="number"
          inputMode="decimal"
          min={0}
          placeholder="0"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          data-testid="returns-amount-input"
        />
        {result.isOverCap && (
          <p className="text-xs text-amber-600 font-medium" data-testid="returns-overcap-warning">
            Amount exceeds available cap ({fundingCap ?? faceValue} XLM). Calculation capped.
          </p>
        )}
      </div>

      {/* Hold Duration Selector (To Maturity / Custom Date) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-muted-foreground">Hold duration</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                holdMode === "maturity"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setHoldMode("maturity")}
              data-testid="returns-hold-maturity-btn"
            >
              To maturity ({maxMaturityDays}d)
            </button>
            <button
              type="button"
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                holdMode === "custom"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setHoldMode("custom")}
              data-testid="returns-hold-custom-btn"
            >
              Custom date
            </button>
          </div>
        </div>

        {holdMode === "custom" && (
          <div className="flex items-center gap-2 pt-1" data-testid="returns-custom-date-container">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="text-xs h-8"
              aria-label="Custom hold date"
              data-testid="returns-custom-date-input"
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Metrics Breakdown Grid */}
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm rounded-lg bg-muted/30 p-3 border">
        <div>
          <dt className="text-xs text-muted-foreground">Fractions</dt>
          <dd className="font-semibold tabular-nums" data-testid="returns-fractions">
            {result.fractionCount.toLocaleString()}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Share of supply</dt>
          <dd className="font-semibold tabular-nums" data-testid="returns-share">
            {result.shareOfSupply.toFixed(2)}%
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Gross return</dt>
          <dd className="font-semibold tabular-nums" data-testid="returns-gross">
            <Money xlm={result.grossReturn} xlmText={`${result.grossReturn.toFixed(2)} XLM`} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Platform fee</dt>
          <dd className="font-semibold tabular-nums text-muted-foreground" data-testid="returns-fee">
            {result.feeAmount > 0 ? (
              <Money xlm={result.feeAmount} xlmText={`-${result.feeAmount.toFixed(2)} XLM`} />
            ) : (
              "0.00 XLM"
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Net return</dt>
          <dd className="font-semibold tabular-nums text-emerald-600" data-testid="returns-net">
            <Money xlm={result.netReturn} xlmText={`+${result.netReturn.toFixed(2)} XLM`} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Net ROI</dt>
          <dd className="font-semibold tabular-nums text-emerald-600" data-testid="returns-roi">
            {result.netRoiPercentage.toFixed(2)}%
          </dd>
        </div>
        {result.netReturnUsd !== undefined && (
          <div className="col-span-2">
            <dt className="text-xs text-muted-foreground">Net return (USD)</dt>
            <dd className="font-semibold tabular-nums text-emerald-600" data-testid="returns-net-usd">
              ${result.netReturnUsd.toFixed(2)} USD
            </dd>
          </div>
        )}
      </dl>

      <p className="text-xs text-muted-foreground" data-testid="returns-days-summary">
        Projection based on {daysRemaining} days hold period.
      </p>
    </div>
  );
}
