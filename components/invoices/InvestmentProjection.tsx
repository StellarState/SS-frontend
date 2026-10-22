"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchDynamicYield, fetchFeeSchedule, fetchXlmUsdRate } from "@/lib/api";
import { formatFiat } from "@/lib/currency";
import { formatXLM } from "@/lib/format";
import { calculateInvestmentProjection } from "@/lib/investmentProjection";
import { daysUntil, parseAmount } from "@/lib/returnsCalculator";

interface InvestmentProjectionProps {
  issuerWallet: string;
  invoiceYieldPercent?: number | null;
  maturityDate: string;
  fractionPrice: number;
  maxInvestment: number;
  amountRaw: string;
  onAmountChange: (value: string) => void;
}

export function InvestmentProjection({
  issuerWallet,
  invoiceYieldPercent,
  maturityDate,
  fractionPrice,
  maxInvestment,
  amountRaw,
  onAmountChange,
}: InvestmentProjectionProps) {
  const [holdMode, setHoldMode] = useState<"maturity" | "custom">("maturity");
  const [customDate, setCustomDate] = useState("");
  const issuerYield = useQuery({
    queryKey: ["dynamic-yield", issuerWallet],
    queryFn: () => fetchDynamicYield(issuerWallet),
    enabled: Boolean(issuerWallet),
  });
  const feeSchedule = useQuery({ queryKey: ["fee-schedule"], queryFn: fetchFeeSchedule });
  const usdRate = useQuery({ queryKey: ["xlm-usd-rate"], queryFn: fetchXlmUsdRate });

  const validPrice = Number.isFinite(fractionPrice) && fractionPrice >= 0.0000001 ? fractionPrice : 1;
  const amount = parseAmount(amountRaw);
  const amountUnits = Math.round(amount * 10_000_000);
  const fractionCount = Math.floor(amountUnits / Math.round(validPrice * 10_000_000));
  const maturityDays = daysUntil(maturityDate);
  const holdDays = holdMode === "maturity" ? maturityDays : daysUntil(customDate);
  const invalidCustomDate = holdMode === "custom" &&
    (!customDate || holdDays <= 0 || holdDays > maturityDays);
  const issuerRate = issuerYield.data?.current_rate;
  const annualYieldPercent = issuerRate != null && Number.isFinite(issuerRate) && issuerRate >= 0
    ? issuerRate : invoiceYieldPercent;
  const investmentFee = feeSchedule.data?.fees.find(
    (fee) => fee.fee_type === "investment_fee" && fee.applies_to !== "issuer"
  );
  const feePercent = investmentFee?.rate_percentage;
  const canProject = Number.isSafeInteger(amountUnits) && Number.isSafeInteger(fractionCount) && fractionCount > 0 &&
    amount <= maxInvestment && !invalidCustomDate && maturityDays > 0 &&
    annualYieldPercent != null && Number.isFinite(annualYieldPercent) && annualYieldPercent >= 0 &&
    feePercent != null && Number.isFinite(feePercent) && feePercent >= 0 && feePercent <= 100;
  const result = canProject ? calculateInvestmentProjection({
    fractionCount,
    fractionPrice: validPrice,
    annualYieldPercent,
    holdDays,
    investmentFeePercent: feePercent,
  }) : null;
  const xlmUsdRate = usdRate.data?.rate;
  const hasUsdRate = xlmUsdRate != null && Number.isFinite(xlmUsdRate) && xlmUsdRate > 0;
  const formatProjection = (xlm: number) => hasUsdRate
    ? `${formatFiat(xlm * xlmUsdRate, "USD")} (${formatXLM(xlm)})`
    : formatXLM(xlm);

  return (
    <section className="space-y-3 border-t pt-4 text-sm" aria-label="Projected returns" data-testid="investment-projection">
      <h4 className="font-semibold">Projected returns</h4>
      <div className="space-y-1.5">
        <Label htmlFor="projection-fractions">Fractions</Label>
        <Input
          id="projection-fractions"
          data-testid="projection-fractions"
          type="number"
          inputMode="numeric"
          min={0}
          max={Math.floor(Math.round(maxInvestment * 10_000_000) / Math.round(validPrice * 10_000_000))}
          step={1}
          value={amountRaw === "" ? "" : fractionCount}
          onChange={(event) => {
            const count = Number(event.target.value);
            if (event.target.value === "") onAmountChange("");
            else if (Number.isSafeInteger(count) && count >= 0) {
              onAmountChange(String(count * validPrice));
            }
          }}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="projection-hold">Hold until</Label>
        <select
          id="projection-hold"
          data-testid="projection-hold"
          className="h-9 w-full rounded-md border border-input bg-background px-3"
          value={holdMode}
          onChange={(event) => setHoldMode(event.target.value as "maturity" | "custom")}
        >
          <option value="maturity">Maturity</option>
          <option value="custom">Custom date</option>
        </select>
      </div>
      {holdMode === "custom" && (
        <div className="space-y-1.5">
          <Label htmlFor="projection-date">Hold date</Label>
          <Input
            id="projection-date"
            data-testid="projection-date"
            type="date"
            min={new Date().toISOString().slice(0, 10)}
            max={maturityDate.slice(0, 10)}
            value={customDate}
            aria-invalid={invalidCustomDate}
            onChange={(event) => setCustomDate(event.target.value)}
          />
          {invalidCustomDate && customDate && <p role="alert" className="text-destructive">Choose a date before maturity and after today.</p>}
        </div>
      )}
      {result ? (
        <dl className="space-y-1.5" data-testid="projection-results">
          <div className="flex justify-between gap-3"><dt>Gross return</dt><dd className="text-right tabular-nums" data-testid="projection-gross">{formatProjection(result.grossProfit)}</dd></div>
          <div className="flex justify-between gap-3"><dt>Platform fee ({feePercent}%)</dt><dd className="text-right tabular-nums" data-testid="projection-fee">-{formatProjection(result.investmentFee)}</dd></div>
          <div className="flex justify-between gap-3 font-semibold"><dt>Net return</dt><dd className="text-right tabular-nums" data-testid="projection-net">{formatProjection(result.netProfit)}</dd></div>
          <div className="flex justify-between gap-3"><dt>Net ROI on total paid</dt><dd className="tabular-nums" data-testid="projection-percent">{result.netReturnPercent.toFixed(2)}%</dd></div>
        </dl>
      ) : (
        <p className="text-muted-foreground" data-testid="projection-unavailable">
          {amount > maxInvestment ? "Amount exceeds the available investment." :
            feeSchedule.isError || (feeSchedule.data && !investmentFee) ? "Current investment fee unavailable." :
              annualYieldPercent == null ? "Issuer yield unavailable." :
                "Enter fractions and a valid hold date to see your estimate."}
        </p>
      )}
      {result && amount - result.principal > 0.0000001 && (
        <p className="text-xs text-muted-foreground" data-testid="projection-remainder">
          {formatXLM(amount - result.principal)} does not buy a whole fraction and is excluded from this estimate.
        </p>
      )}
      {!hasUsdRate && <p className="text-xs text-muted-foreground">USD estimate unavailable; amounts shown in XLM.</p>}
      <p className="text-xs text-muted-foreground">
        {annualYieldPercent != null ? `${annualYieldPercent.toFixed(2)}% annual issuer yield` : "Issuer yield unavailable"}
        {issuerYield.data ? " from issuer history" : " from invoice"}; {holdDays} projected days.
        Estimate uses simple interest and the current investment fee. Early resale prices and fees are not included.
      </p>
    </section>
  );
}
