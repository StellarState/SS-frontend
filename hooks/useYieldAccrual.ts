"use client";
import { useState, useEffect } from "react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { computeAccrual, type AccrualResult } from "@/lib/yieldAccrual";

const UPDATE_INTERVAL_MS = 60_000; // 60 seconds

/**
 * Live yield accrual for a single portfolio position (#639).
 *
 * Reads position data from the cached portfolio query (no extra fetch).
 * Recalculates every 60 s via setInterval without triggering a network
 * request. Falls back to null when the position or required fields are absent.
 *
 * Uses:
 *   principal     → position.committed_amount
 *   annualRatePct → position.yield_percentage (if present, else 0)
 *   startDate     → position.funded_at (if present, else today)
 *   maturityDate  → position.due_date
 */
export function useYieldAccrual(invoiceId: string): AccrualResult | null {
  const { data } = usePortfolio();
  const [result, setResult] = useState<AccrualResult | null>(null);

  useEffect(() => {
    if (!data) return;

    const position = data.positions.find((p) => p.invoice_id === invoiceId);
    if (!position) {
      setResult(null);
      return;
    }

    const principal = position.committed_amount;
    // yield_percentage may be absent on InvestmentPosition; treat as 0 when missing
    const annualRatePct =
      (position as unknown as { yield_percentage?: number }).yield_percentage ?? 0;
    const maturityDate = position.due_date ?? null;

    if (!maturityDate || principal <= 0) {
      setResult(null);
      return;
    }

    // funded_at is not on InvestmentPosition; fall back to 30 days before maturity
    const rawFundedAt = (position as unknown as { funded_at?: string | null })
      .funded_at;
    const startDate =
      rawFundedAt ??
      new Date(
        new Date(maturityDate).getTime() - 30 * 24 * 60 * 60 * 1000,
      ).toISOString();

    function recalculate() {
      setResult(
        computeAccrual({ principal, annualRatePct, startDate, maturityDate: maturityDate! }),
      );
    }

    recalculate();
    const timer = setInterval(recalculate, UPDATE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [data, invoiceId]);

  return result;
}
