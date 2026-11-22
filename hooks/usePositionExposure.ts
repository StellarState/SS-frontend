"use client";

import { useState, useMemo } from "react";
import { usePortfolio } from "@/hooks/usePortfolio";
import {
  evaluatePositionExposure,
  type ProposedInvoiceDetails,
  type AlternativeInvoice,
  type ExposureEvaluation,
  DEFAULT_SOFT_LIMIT_PERCENT,
  DEFAULT_HARD_LIMIT_PERCENT,
} from "@/lib/analytics/exposureLimits";
import type { ConcentrationPosition } from "@/lib/analytics/concentration";

export const DEFAULT_MOCK_ALTERNATIVES: AlternativeInvoice[] = [
  {
    id: "alt-inv-singapore",
    title: "Asia-Pacific Clean Tech Logistics Note",
    issuer: "G_ISSUER_ALT_1",
    debtor: "Pacific Green Freight",
    jurisdiction: "Singapore",
    yield_rate: 11.2,
    remaining_capacity: 75000,
  },
  {
    id: "alt-inv-uk",
    title: "European Maritime Export Facility",
    issuer: "G_ISSUER_ALT_2",
    debtor: "NorthSea Maritime Ltd",
    jurisdiction: "United Kingdom",
    yield_rate: 10.8,
    remaining_capacity: 50000,
  },
  {
    id: "alt-inv-japan",
    title: "Tokyo Electronics Component Settlement",
    issuer: "G_ISSUER_ALT_3",
    debtor: "Nippon Micro Supply",
    jurisdiction: "Japan",
    yield_rate: 9.8,
    remaining_capacity: 120000,
  },
];

export interface UsePositionExposureOptions {
  invoice: ProposedInvoiceDetails;
  proposedAmount: number;
  initialPositions?: ConcentrationPosition[];
  availableAlternatives?: AlternativeInvoice[];
  softLimitPercent?: number;
  hardLimitPercent?: number;
}

export function usePositionExposure(options: UsePositionExposureOptions) {
  const {
    invoice,
    proposedAmount,
    initialPositions,
    availableAlternatives = DEFAULT_MOCK_ALTERNATIVES,
    softLimitPercent = DEFAULT_SOFT_LIMIT_PERCENT,
    hardLimitPercent = DEFAULT_HARD_LIMIT_PERCENT,
  } = options;

  const portfolioQuery = usePortfolio();
  const [isDismissed, setIsDismissed] = useState(false);

  // Normalize positions from portfolio or fallback
  const positions: ConcentrationPosition[] = useMemo(() => {
    if (initialPositions) return initialPositions;
    if (portfolioQuery.data?.positions) {
      return portfolioQuery.data.positions as unknown as ConcentrationPosition[];
    }
    return [];
  }, [initialPositions, portfolioQuery.data?.positions]);

  // Compute live exposure evaluation
  const evaluation: ExposureEvaluation = useMemo(() => {
    return evaluatePositionExposure({
      positions,
      proposedAmount,
      invoice,
      availableAlternatives,
      softLimitPercent,
      hardLimitPercent,
    });
  }, [positions, proposedAmount, invoice, availableAlternatives, softLimitPercent, hardLimitPercent]);

  return {
    evaluation,
    isHardBlocked: evaluation.isHardBlocked,
    hasSoftWarning: evaluation.hasSoftWarning,
    shouldShowSoftWarning: evaluation.hasSoftWarning && !isDismissed,
    isSoftWarningDismissed: isDismissed,
    dismissSoftWarning: () => setIsDismissed(true),
    resetDismissal: () => setIsDismissed(false),
  };
}
