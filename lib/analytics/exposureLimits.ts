export type ExposureDimension = "issuer" | "debtor" | "jurisdiction";

export interface LeveragedPositionItem {
  invoice_id: string;
  title?: string;
  issuer: string;
  debtor: string;
  jurisdiction: string;
  committed_amount: number;
  status?: string;
}

export interface ProposedOrderQuote {
  invoice_id: string;
  title: string;
  issuer: string;
  debtor: string;
  jurisdiction: string;
  amount: number; // in XLM
}

export interface AlternativeAsset {
  id: string;
  title: string;
  issuer: string;
  debtor: string;
  jurisdiction: string;
  yieldPercent: number;
  riskTier: string;
}

export interface DimensionBreach {
  dimension: ExposureDimension;
  key: string;
  label: string;
  currentAmount: number;
  currentPercent: number;
  resultingAmount: number;
  resultingPercent: number;
  limitPercent: number;
  isHardBreach: boolean;
  isSoftBreach: boolean;
}

export interface ExposureLimitsConfig {
  softLimitPercent: number; // default: 25.0%
  hardLimitPercent: number; // default: 40.0%
}

export interface ExposureEvaluationResult {
  currentTotal: number;
  proposedAmount: number;
  resultingTotal: number;
  dimensions: DimensionBreach[];
  softBreaches: DimensionBreach[];
  hardBreaches: DimensionBreach[];
  isHardBlocked: boolean;
  requiresWarning: boolean;
  breachedDimensionDescriptions: string[];
  qualifiedAlternatives: Array<AlternativeAsset & { resultingPercent: number }>;
}

export const DEFAULT_EXPOSURE_LIMITS: ExposureLimitsConfig = {
  softLimitPercent: 25.0,
  hardLimitPercent: 40.0,
};

function roundPercent(val: number): number {
  return Math.round(val * 100) / 100;
}

/**
 * Calculates portfolio concentration and evaluates exposure boundaries across
 * issuer, debtor, and jurisdiction dimensions.
 */
export function evaluateLeveragedExposure(
  currentPositions: readonly LeveragedPositionItem[],
  proposedQuote: ProposedOrderQuote,
  config: ExposureLimitsConfig = DEFAULT_EXPOSURE_LIMITS,
  candidateAlternatives: readonly AlternativeAsset[] = [],
): ExposureEvaluationResult {
  const activePositions = currentPositions.filter(
    (p) => (p.status ? p.status === "active" : true) && p.committed_amount > 0,
  );

  let currentTotal = 0;
  const dimensionAggregates: Record<
    ExposureDimension,
    Map<string, { currentAmount: number; label: string }>
  > = {
    issuer: new Map(),
    debtor: new Map(),
    jurisdiction: new Map(),
  };

  for (const pos of activePositions) {
    currentTotal += pos.committed_amount;

    const dims: Record<ExposureDimension, string> = {
      issuer: (pos.issuer || "Unspecified").trim(),
      debtor: (pos.debtor || "Unspecified").trim(),
      jurisdiction: (pos.jurisdiction || "Unspecified").trim(),
    };

    for (const [dim, key] of Object.entries(dims) as Array<[ExposureDimension, string]>) {
      const map = dimensionAggregates[dim];
      const existing = map.get(key) ?? { currentAmount: 0, label: key };
      existing.currentAmount += pos.committed_amount;
      map.set(key, existing);
    }
  }

  const proposedAmount = Math.max(0, proposedQuote.amount || 0);
  const resultingTotal = currentTotal + proposedAmount;

  const proposedKeys: Record<ExposureDimension, string> = {
    issuer: (proposedQuote.issuer || "Unspecified").trim(),
    debtor: (proposedQuote.debtor || "Unspecified").trim(),
    jurisdiction: (proposedQuote.jurisdiction || "Unspecified").trim(),
  };

  const dimNames: ExposureDimension[] = ["issuer", "debtor", "jurisdiction"];

  if (currentTotal === 0) {
    // Initial position establishing portfolio baseline — not a concentration breach
    return {
      currentTotal: 0,
      proposedAmount,
      resultingTotal: proposedAmount,
      dimensions: dimNames.map((dim) => ({
        dimension: dim,
        key: proposedKeys[dim],
        label: proposedKeys[dim],
        currentAmount: 0,
        currentPercent: 0,
        resultingAmount: proposedAmount,
        resultingPercent: 100,
        limitPercent: config.softLimitPercent,
        isHardBreach: false,
        isSoftBreach: false,
      })),
      softBreaches: [],
      hardBreaches: [],
      isHardBlocked: false,
      requiresWarning: false,
      breachedDimensionDescriptions: [],
      qualifiedAlternatives: [],
    };
  }

  const dimensions: DimensionBreach[] = [];
  const softBreaches: DimensionBreach[] = [];
  const hardBreaches: DimensionBreach[] = [];
  const descriptions: string[] = [];

  for (const dim of dimNames) {
    const key = proposedKeys[dim];
    const currentEntry = dimensionAggregates[dim].get(key);
    const currentAmount = currentEntry ? currentEntry.currentAmount : 0;
    const resultingAmount = currentAmount + proposedAmount;

    const currentPercent = currentTotal > 0 ? roundPercent((currentAmount / currentTotal) * 100) : 0;
    const resultingPercent = resultingTotal > 0 ? roundPercent((resultingAmount / resultingTotal) * 100) : 0;

    // Strict boundary checks without off-by-one errors:
    // Soft breach: resultingPercent > softLimitPercent && resultingPercent <= hardLimitPercent
    // Hard breach: resultingPercent > hardLimitPercent
    const isHard = resultingPercent > config.hardLimitPercent;
    const isSoft = resultingPercent > config.softLimitPercent && !isHard;

    const breach: DimensionBreach = {
      dimension: dim,
      key,
      label: key,
      currentAmount,
      currentPercent,
      resultingAmount,
      resultingPercent,
      limitPercent: isHard ? config.hardLimitPercent : config.softLimitPercent,
      isHardBreach: isHard,
      isSoftBreach: isSoft,
    };

    dimensions.push(breach);

    if (isHard) {
      hardBreaches.push(breach);
      descriptions.push(
        `Hard Block: ${capitalize(dim)} "${key}" exceeds ${config.hardLimitPercent}% limit (${resultingPercent}%).`,
      );
    } else if (isSoft) {
      softBreaches.push(breach);
      descriptions.push(
        `Soft Warning: ${capitalize(dim)} "${key}" exceeds ${config.softLimitPercent}% limit (${resultingPercent}%).`,
      );
    }
  }

  const isHardBlocked = hardBreaches.length > 0;
  const requiresWarning = softBreaches.length > 0 && !isHardBlocked;

  // Filter alternatives: must NOT breach soft limits on ANY dimension!
  const qualifiedAlternatives: Array<AlternativeAsset & { resultingPercent: number }> = [];

  for (const alt of candidateAlternatives) {
    let altSafe = true;
    let maxResultingPercent = 0;

    const altDims: Record<ExposureDimension, string> = {
      issuer: (alt.issuer || "Unspecified").trim(),
      debtor: (alt.debtor || "Unspecified").trim(),
      jurisdiction: (alt.jurisdiction || "Unspecified").trim(),
    };

    for (const [dim, k] of Object.entries(altDims) as Array<[ExposureDimension, string]>) {
      const existingAmt = dimensionAggregates[dim].get(k)?.currentAmount ?? 0;
      const altResultingAmt = existingAmt + proposedAmount;
      const altResultingPct = resultingTotal > 0 ? roundPercent((altResultingAmt / resultingTotal) * 100) : 0;
      if (altResultingPct > maxResultingPercent) {
        maxResultingPercent = altResultingPct;
      }
      if (altResultingPct > config.softLimitPercent) {
        altSafe = false;
        break;
      }
    }

    if (altSafe) {
      qualifiedAlternatives.push({
        ...alt,
        resultingPercent: maxResultingPercent,
      });
    }
  }

  return {
    currentTotal,
    proposedAmount,
    resultingTotal,
    dimensions,
    softBreaches,
    hardBreaches,
    isHardBlocked,
    requiresWarning,
    breachedDimensionDescriptions: descriptions,
    qualifiedAlternatives,
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
