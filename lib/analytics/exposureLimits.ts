/**
 * Leveraged position exposure and concentration limits for issue #689.
 *
 * Evaluates investor concentration across issuer, debtor, and jurisdiction
 * dimensions. Enforces soft warning (dismissible) and hard block thresholds,
 * and recommends lower-risk alternatives that respect limits.
 */

import type { ConcentrationPosition } from "./concentration";

export type ExposureDimension = "issuer" | "debtor" | "jurisdiction";

export const DEFAULT_SOFT_LIMIT_PERCENT = 25; // 25% concentration triggers warning
export const DEFAULT_HARD_LIMIT_PERCENT = 40; // 40% concentration hard-blocks investment

export interface ProposedInvoiceDetails {
  id: string;
  issuer: string;
  debtor?: string | null;
  jurisdiction?: string | null;
  title?: string;
}

export interface AlternativeInvoice {
  id: string;
  title: string;
  issuer: string;
  debtor: string;
  jurisdiction: string;
  yield_rate: number;
  remaining_capacity: number;
}

export interface DimensionExposure {
  dimension: ExposureDimension;
  dimensionKey: string;
  currentPrincipal: number;
  currentSharePercent: number;
  resultingPrincipal: number;
  resultingSharePercent: number;
  softLimitPercent: number;
  hardLimitPercent: number;
  status: "safe" | "soft_warning" | "hard_block";
  breachMessage?: string;
}

export interface ExposureEvaluation {
  totalCurrentPortfolio: number;
  totalResultingPortfolio: number;
  proposedAmount: number;
  dimensions: DimensionExposure[];
  isHardBlocked: boolean;
  hasSoftWarning: boolean;
  breachedHardDimensions: DimensionExposure[];
  breachedSoftDimensions: DimensionExposure[];
  alternativeRecommendations: AlternativeInvoice[];
}

function cleanLabel(value: unknown): string {
  if (typeof value !== "string") return "Unspecified";
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed || "Unspecified";
}

/**
 * Derives current principal invested in a specific key for a given dimension.
 */
export function calculateDimensionPrincipal(
  positions: readonly ConcentrationPosition[],
  dimension: ExposureDimension,
  targetKey: string,
): { currentDimensionTotal: number; portfolioTotal: number } {
  let currentDimensionTotal = 0;
  let portfolioTotal = 0;
  const targetClean = cleanLabel(targetKey).toLowerCase();

  for (const pos of positions) {
    if (!pos || pos.status !== "active") continue;
    const principal = Number(pos.committed_amount);
    if (!Number.isFinite(principal) || principal <= 0) continue;

    portfolioTotal += principal;

    let posKey = "";
    if (dimension === "issuer") {
      // In ConcentrationPosition, issuer address may be in seller, issuer, or debtor
      posKey = cleanLabel((pos as { seller?: string; issuer?: string }).seller ?? (pos as { issuer?: string }).issuer);
    } else if (dimension === "debtor") {
      posKey = cleanLabel(pos.debtor);
    } else if (dimension === "jurisdiction") {
      posKey = cleanLabel(pos.jurisdiction);
    }

    if (posKey.toLowerCase() === targetClean) {
      currentDimensionTotal += principal;
    }
  }

  return { currentDimensionTotal, portfolioTotal };
}

export interface EvaluateExposureParams {
  positions: readonly ConcentrationPosition[];
  proposedAmount: number;
  invoice: ProposedInvoiceDetails;
  availableAlternatives?: readonly AlternativeInvoice[];
  softLimitPercent?: number;
  hardLimitPercent?: number;
}

/**
 * Core exposure evaluation engine.
 * Computes resulting concentration utilisation across issuer, debtor, and jurisdiction.
 */
export function evaluatePositionExposure(params: EvaluateExposureParams): ExposureEvaluation {
  const {
    positions,
    proposedAmount: rawAmount,
    invoice,
    availableAlternatives = [],
    softLimitPercent = DEFAULT_SOFT_LIMIT_PERCENT,
    hardLimitPercent = DEFAULT_HARD_LIMIT_PERCENT,
  } = params;

  const proposedAmount = Math.max(0, Number(rawAmount || 0));

  // Base portfolio total of all active investments
  const activePortfolioTotal = positions
    .filter((p) => p && p.status === "active")
    .reduce((sum, p) => sum + Math.max(0, Number(p.committed_amount || 0)), 0);

  const totalCurrentPortfolio = activePortfolioTotal;
  const totalResultingPortfolio = activePortfolioTotal + proposedAmount;

  const dimensionConfigs: Array<{ dimension: ExposureDimension; key: string }> = [
    { dimension: "issuer", key: invoice.issuer },
    { dimension: "debtor", key: invoice.debtor ?? "Unspecified" },
    { dimension: "jurisdiction", key: invoice.jurisdiction ?? "Unspecified" },
  ];

  const dimensions: DimensionExposure[] = dimensionConfigs.map(({ dimension, key }) => {
    const { currentDimensionTotal } = calculateDimensionPrincipal(positions, dimension, key);
    const resultingPrincipal = currentDimensionTotal + proposedAmount;

    const currentSharePercent =
      totalCurrentPortfolio > 0 ? (currentDimensionTotal / totalCurrentPortfolio) * 100 : 0;

    const resultingSharePercent =
      totalResultingPortfolio > 0 ? (resultingPrincipal / totalResultingPortfolio) * 100 : 0;

    let status: "safe" | "soft_warning" | "hard_block" = "safe";
    let breachMessage: string | undefined = undefined;

    if (resultingSharePercent > hardLimitPercent) {
      status = "hard_block";
      breachMessage = `${dimension.toUpperCase()} limit breached: ${resultingSharePercent.toFixed(1)}% exceeds hard limit of ${hardLimitPercent}%`;
    } else if (resultingSharePercent > softLimitPercent) {
      status = "soft_warning";
      breachMessage = `High ${dimension} concentration: ${resultingSharePercent.toFixed(1)}% exceeds warning threshold of ${softLimitPercent}%`;
    }

    return {
      dimension,
      dimensionKey: key,
      currentPrincipal: currentDimensionTotal,
      currentSharePercent: Number(currentSharePercent.toFixed(2)),
      resultingPrincipal,
      resultingSharePercent: Number(resultingSharePercent.toFixed(2)),
      softLimitPercent,
      hardLimitPercent,
      status,
      breachMessage,
    };
  });

  const breachedHardDimensions = dimensions.filter((d) => d.status === "hard_block");
  const breachedSoftDimensions = dimensions.filter((d) => d.status === "soft_warning");

  const isHardBlocked = breachedHardDimensions.length > 0;
  const hasSoftWarning = breachedSoftDimensions.length > 0 && !isHardBlocked;

  // Filter alternatives that respect limits (do NOT match any breached dimension keys)
  const breachedKeys = new Set(
    [...breachedHardDimensions, ...breachedSoftDimensions].map((d) => d.dimensionKey.toLowerCase()),
  );

  const alternativeRecommendations = availableAlternatives.filter((alt) => {
    if (breachedKeys.has(alt.issuer.toLowerCase())) return false;
    if (breachedKeys.has(alt.debtor.toLowerCase())) return false;
    if (breachedKeys.has(alt.jurisdiction.toLowerCase())) return false;
    return alt.id !== invoice.id;
  });

  return {
    totalCurrentPortfolio,
    totalResultingPortfolio,
    proposedAmount,
    dimensions,
    isHardBlocked,
    hasSoftWarning,
    breachedHardDimensions,
    breachedSoftDimensions,
    alternativeRecommendations,
  };
}
