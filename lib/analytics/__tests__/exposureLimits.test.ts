import { describe, it, expect } from "vitest";
import {
  evaluatePositionExposure,
  calculateDimensionPrincipal,
  type AlternativeInvoice,
  type ProposedInvoiceDetails,
} from "../exposureLimits";
import type { ConcentrationPosition } from "../concentration";

const mockPositions: ConcentrationPosition[] = [
  {
    invoice_id: "inv-pos-1",
    committed_amount: 30000,
    status: "active",
    debtor: "Debtor Alpha",
    jurisdiction: "United States",
    seller: "G_ISSUER_1",
  } as unknown as ConcentrationPosition,
  {
    invoice_id: "inv-pos-2",
    committed_amount: 20000,
    status: "active",
    debtor: "Debtor Beta",
    jurisdiction: "Germany",
    seller: "G_ISSUER_2",
  } as unknown as ConcentrationPosition,
  {
    invoice_id: "inv-pos-3",
    committed_amount: 50000,
    status: "active",
    debtor: "Debtor Gamma",
    jurisdiction: "United States",
    seller: "G_ISSUER_3",
  } as unknown as ConcentrationPosition,
];
// Total active portfolio = 30k + 20k + 50k = 100,000

const mockAlternatives: AlternativeInvoice[] = [
  {
    id: "alt-inv-1",
    title: "Singapore Tech Invoice",
    issuer: "G_ISSUER_SAFE_1",
    debtor: "Debtor Safe Corp",
    jurisdiction: "Singapore",
    yield_rate: 11.5,
    remaining_capacity: 50000,
  },
  {
    id: "alt-inv-2",
    title: "US Logistics Note",
    issuer: "G_ISSUER_SAFE_2",
    debtor: "Debtor US Corp",
    jurisdiction: "United States", // Would conflict if US is breached
    yield_rate: 10.0,
    remaining_capacity: 40000,
  },
];

describe("exposureLimits analytics (#689)", () => {
  it("calculates current dimension principal matching portfolio sources", () => {
    const { currentDimensionTotal, portfolioTotal } = calculateDimensionPrincipal(
      mockPositions,
      "debtor",
      "Debtor Alpha",
    );
    expect(currentDimensionTotal).toBe(30000);
    expect(portfolioTotal).toBe(100000);
  });

  it("updates warnings dynamically with quote changes", () => {
    const invoice: ProposedInvoiceDetails = {
      id: "target-inv",
      issuer: "G_ISSUER_CLEAN", // 0 existing
      debtor: "Debtor Alpha", // already has 30,000
      jurisdiction: "Japan", // 0 existing
    };

    // 1. Proposed 0: current total 100k, resulting 100k
    const zeroQuote = evaluatePositionExposure({
      positions: mockPositions,
      proposedAmount: 0,
      invoice,
    });
    expect(zeroQuote.proposedAmount).toBe(0);

    // 2. Small quote of 5,000:
    // Resulting portfolio = 105,000. Debtor Alpha = 35k / 105k = 33.3% -> soft warning (>25%, <=40%)
    const smallQuote = evaluatePositionExposure({
      positions: mockPositions,
      proposedAmount: 5000,
      invoice,
    });
    expect(smallQuote.hasSoftWarning).toBe(true);
    expect(smallQuote.isHardBlocked).toBe(false);

    // 3. Large quote of 50,000:
    // Debtor Alpha = 80k / 150k = 53.3% -> hard block (>40%)
    const largeQuote = evaluatePositionExposure({
      positions: mockPositions,
      proposedAmount: 50000,
      invoice,
    });
    expect(largeQuote.isHardBlocked).toBe(true);
    expect(largeQuote.breachedHardDimensions.map((d) => d.dimension)).toContain("debtor");
  });

  it("identifies breached dimensions on hard blocks", () => {
    const invoice: ProposedInvoiceDetails = {
      id: "inv-new",
      issuer: "G_ISSUER_NEW", // 0 existing
      debtor: "Debtor Alpha", // 30,000 existing
      jurisdiction: "United States", // 80,000 existing
    };

    const evaluation = evaluatePositionExposure({
      positions: mockPositions,
      proposedAmount: 60000,
      invoice,
      softLimitPercent: 25,
      hardLimitPercent: 40,
    });

    // Resulting portfolio = 160,000
    // Jurisdiction US = (80k + 60k) / 160k = 140k / 160k = 87.5% -> Hard Block
    // Debtor Alpha = (30k + 60k) / 160k = 90k / 160k = 56.25% -> Hard Block
    // Issuer = 60k / 160k = 37.5% -> Soft Warning
    expect(evaluation.isHardBlocked).toBe(true);
    const hardDims = evaluation.breachedHardDimensions.map((d) => d.dimension);
    expect(hardDims).toContain("jurisdiction");
    expect(hardDims).toContain("debtor");
    expect(hardDims).not.toContain("issuer");
  });

  it("filters alternatives that strictly respect limits", () => {
    const invoice: ProposedInvoiceDetails = {
      id: "inv-test",
      issuer: "G_ISSUER_1",
      debtor: "Debtor Alpha",
      jurisdiction: "United States", // United States is heavily concentrated
    };

    const evaluation = evaluatePositionExposure({
      positions: mockPositions,
      proposedAmount: 20000,
      invoice,
      availableAlternatives: mockAlternatives,
    });

    // US jurisdiction is breached, so alt-inv-2 (United States) must be excluded
    // alt-inv-1 (Singapore) must be included
    expect(evaluation.alternativeRecommendations.length).toBe(1);
    expect(evaluation.alternativeRecommendations[0].id).toBe("alt-inv-1");
    expect(evaluation.alternativeRecommendations[0].jurisdiction).toBe("Singapore");
  });

  describe("exact threshold boundary checks", () => {
    it("classifies exactly 25.0% as safe and 25.1% as soft warning", () => {
      // Create clean position where portfolio is 100k
      const cleanPositions: ConcentrationPosition[] = [
        {
          invoice_id: "pos-1",
          committed_amount: 20000,
          status: "active",
          debtor: "Target Debtor",
          seller: "G_ISSUER_X",
        } as unknown as ConcentrationPosition,
        {
          invoice_id: "pos-2",
          committed_amount: 80000,
          status: "active",
          debtor: "Other Debtor",
          seller: "G_ISSUER_Y",
        } as unknown as ConcentrationPosition,
      ];

      // If proposed = 0: Target Debtor = 20k / 100k = 20% -> safe
      const evalSafe = evaluatePositionExposure({
        positions: cleanPositions,
        proposedAmount: 0,
        invoice: { id: "inv", issuer: "G_ISSUER_Y", debtor: "Target Debtor" },
        softLimitPercent: 25,
        hardLimitPercent: 40,
      });
      const debtorSafe = evalSafe.dimensions.find((d) => d.dimension === "debtor")!;
      expect(debtorSafe.status).toBe("safe");

      // Boundary: resulting exactly 25.0%
      // Total resulting = 100k + p. Debtor = 20k + p.
      // (20k + p) / (100k + p) = 0.25 => 20k + p = 25k + 0.25p => 0.75p = 5k => p = 6666.67
      const evalExact25 = evaluatePositionExposure({
        positions: cleanPositions,
        proposedAmount: 6666.666,
        invoice: { id: "inv", issuer: "G_ISSUER_Y", debtor: "Target Debtor" },
        softLimitPercent: 25,
        hardLimitPercent: 40,
      });
      const debtorExact25 = evalExact25.dimensions.find((d) => d.dimension === "debtor")!;
      expect(debtorExact25.resultingSharePercent).toBe(25);
      expect(debtorExact25.status).toBe("safe");

      // 25.1% triggers soft warning
      const evalSoft = evaluatePositionExposure({
        positions: cleanPositions,
        proposedAmount: 7000,
        invoice: { id: "inv", issuer: "G_ISSUER_Y", debtor: "Target Debtor" },
        softLimitPercent: 25,
        hardLimitPercent: 40,
      });
      const debtorSoft = evalSoft.dimensions.find((d) => d.dimension === "debtor")!;
      expect(debtorSoft.resultingSharePercent).toBeGreaterThan(25);
      expect(debtorSoft.status).toBe("soft_warning");
    });

    it("classifies exactly 40.0% as soft warning and 40.1% as hard block", () => {
      const cleanPositions: ConcentrationPosition[] = [
        {
          invoice_id: "pos-1",
          committed_amount: 30000,
          status: "active",
          debtor: "Target Debtor",
          seller: "G_ISSUER_X",
          jurisdiction: "France",
        } as unknown as ConcentrationPosition,
        {
          invoice_id: "pos-2",
          committed_amount: 70000,
          status: "active",
          debtor: "Other Debtor",
          seller: "G_ISSUER_Y",
          jurisdiction: "Germany",
        } as unknown as ConcentrationPosition,
      ];

      // Resulting exactly 40%:
      // (30k + p) / (100k + p) = 0.40 => 30k + p = 40k + 0.4p => 0.6p = 10k => p = 16,666.67
      const evalExact40 = evaluatePositionExposure({
        positions: cleanPositions,
        proposedAmount: 16666.666,
        invoice: { id: "inv", issuer: "G_ISSUER_CLEAN", debtor: "Target Debtor", jurisdiction: "Spain" },
        softLimitPercent: 25,
        hardLimitPercent: 40,
      });
      const debtorExact40 = evalExact40.dimensions.find((d) => d.dimension === "debtor")!;
      expect(debtorExact40.resultingSharePercent).toBe(40);
      expect(debtorExact40.status).toBe("soft_warning");
      expect(evalExact40.isHardBlocked).toBe(false);

      // Above 40.0% triggers hard block
      const evalHard = evaluatePositionExposure({
        positions: cleanPositions,
        proposedAmount: 20000,
        invoice: { id: "inv", issuer: "G_ISSUER_CLEAN", debtor: "Target Debtor", jurisdiction: "Spain" },
        softLimitPercent: 25,
        hardLimitPercent: 40,
      });
      const debtorHard = evalHard.dimensions.find((d) => d.dimension === "debtor")!;
      expect(debtorHard.resultingSharePercent).toBeGreaterThan(40);
      expect(debtorHard.status).toBe("hard_block");
      expect(evalHard.isHardBlocked).toBe(true);
    });
  });
});
