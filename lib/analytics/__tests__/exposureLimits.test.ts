import { describe, it, expect } from "vitest";
import {
  evaluateLeveragedExposure,
  DEFAULT_EXPOSURE_LIMITS,
  type LeveragedPositionItem,
  type ProposedOrderQuote,
  type AlternativeAsset,
} from "../exposureLimits";

const basePositions: LeveragedPositionItem[] = [
  {
    invoice_id: "inv-1",
    title: "Nordic Tech Logistics",
    issuer: "Nordic Capital",
    debtor: "Oslo Port Corp",
    jurisdiction: "Norway",
    committed_amount: 30000,
    status: "active",
  },
  {
    invoice_id: "inv-2",
    title: "Iberian Energy Solar",
    issuer: "Sol Iberia",
    debtor: "Valencia Utilities",
    jurisdiction: "Spain",
    committed_amount: 40000,
    status: "active",
  },
  {
    invoice_id: "inv-3",
    title: "Bavarian Machine Tools",
    issuer: "Munich Finance",
    debtor: "Bavaria Auto",
    jurisdiction: "Germany",
    committed_amount: 30000,
    status: "active",
  },
];
// Total current portfolio = 100,000 XLM
// Nordic Capital: 30%, Sol Iberia: 40%, Munich Finance: 30%
// Norway: 30%, Spain: 40%, Germany: 30%

const sampleAlternatives: AlternativeAsset[] = [
  {
    id: "alt-fra",
    title: "French Railway Supply #55",
    issuer: "Parisian Credit",
    debtor: "SNCF Partner",
    jurisdiction: "France",
    yieldPercent: 8.0,
    riskTier: "A",
  },
  {
    id: "alt-norway",
    title: "Nordic Shipping Bond",
    issuer: "Nordic Capital", // breaches soft limit on Nordic Capital
    debtor: "Oslo Port Corp",
    jurisdiction: "Norway",
    yieldPercent: 9.5,
    riskTier: "B",
  },
];

describe("evaluateLeveragedExposure", () => {
  it("calculates concentration and utilisation across issuer, debtor, and jurisdiction", () => {
    const quote: ProposedOrderQuote = {
      invoice_id: "inv-new",
      title: "French Agri Export",
      issuer: "Credit Agricole",
      debtor: "Normandy Grain",
      jurisdiction: "France",
      amount: 25000,
    };
    // Resulting total = 125,000. French Agri: 25,000 / 125,000 = 20%
    const res = evaluateLeveragedExposure(basePositions, quote, DEFAULT_EXPOSURE_LIMITS);

    expect(res.currentTotal).toBe(100000);
    expect(res.resultingTotal).toBe(125000);
    expect(res.isHardBlocked).toBe(false);
    expect(res.requiresWarning).toBe(false);

    const issuerDim = res.dimensions.find((d) => d.dimension === "issuer");
    expect(issuerDim).toBeDefined();
    expect(issuerDim?.resultingPercent).toBe(20);
  });

  it("triggers a soft warning when a dimension exceeds the 25% soft limit but stays <= 40%", () => {
    // Current Nordic Capital: 30,000. Add 10,000.
    // Resulting total = 110,000. Nordic Capital = 40,000 / 110,000 = 36.36% (soft breach: >25% and <=40%)
    const quote: ProposedOrderQuote = {
      invoice_id: "inv-nordic-add",
      title: "More Nordic Tech",
      issuer: "Nordic Capital",
      debtor: "Oslo Port Corp",
      jurisdiction: "Norway",
      amount: 10000,
    };

    const res = evaluateLeveragedExposure(basePositions, quote, DEFAULT_EXPOSURE_LIMITS);
    expect(res.isHardBlocked).toBe(false);
    expect(res.requiresWarning).toBe(true);
    expect(res.softBreaches.length).toBeGreaterThan(0);
    expect(res.softBreaches.some((b) => b.dimension === "issuer" && b.label === "Nordic Capital")).toBe(true);
  });

  it("hard blocks orders when resulting exposure exceeds the 40% hard limit", () => {
    // Current Sol Iberia: 40,000. Add 50,000.
    // Resulting total = 150,000. Sol Iberia = 90,000 / 150,000 = 60% (hard breach > 40%)
    const quote: ProposedOrderQuote = {
      invoice_id: "inv-huge-sol",
      title: "Massive Solar Farm",
      issuer: "Sol Iberia",
      debtor: "Valencia Utilities",
      jurisdiction: "Spain",
      amount: 50000,
    };

    const res = evaluateLeveragedExposure(basePositions, quote, DEFAULT_EXPOSURE_LIMITS);
    expect(res.isHardBlocked).toBe(true);
    expect(res.hardBreaches.length).toBeGreaterThan(0);
    expect(res.breachedDimensionDescriptions[0]).toMatch(/hard block/i);
    expect(res.hardBreaches.some((b) => b.label === "Sol Iberia")).toBe(true);
  });

  it("evaluates exact boundary limits without off-by-one errors", () => {
    // Setup clean 100k portfolio: 10,000 in Target Issuer
    const testPositions: LeveragedPositionItem[] = [
      {
        invoice_id: "pos-1",
        issuer: "Alpha Issuer",
        debtor: "Debtor A",
        jurisdiction: "UK",
        committed_amount: 10000,
      },
      {
        invoice_id: "pos-2",
        issuer: "Other Issuer",
        debtor: "Debtor B",
        jurisdiction: "US",
        committed_amount: 90000,
      },
    ];

    // Total = 100k.
    // If we add 20k to Alpha: total = 120k, Alpha = 30k / 120k = 25.00%
    const exactSoftBoundaryQuote: ProposedOrderQuote = {
      invoice_id: "quote-1",
      title: "Exact 25%",
      issuer: "Alpha Issuer",
      debtor: "Debtor A",
      jurisdiction: "UK",
      amount: 20000,
    };
    const atSoftLimit = evaluateLeveragedExposure(testPositions, exactSoftBoundaryQuote, {
      softLimitPercent: 25.0,
      hardLimitPercent: 40.0,
    });
    // At exactly 25.00%, it must NOT breach the soft limit (soft breach is > 25.00%)
    const alphaAtSoft = atSoftLimit.dimensions.find((d) => d.dimension === "issuer");
    expect(alphaAtSoft?.resultingPercent).toBe(25.0);
    expect(alphaAtSoft?.isSoftBreach).toBe(false);

    // If we add 20,010 to Alpha: total = 120,010, Alpha = 30,010 / 120,010 = 25.01%
    const aboveSoftBoundaryQuote: ProposedOrderQuote = {
      invoice_id: "quote-2",
      title: "25.01%",
      issuer: "Alpha Issuer",
      debtor: "Debtor A",
      jurisdiction: "UK",
      amount: 20020,
    };
    const aboveSoftLimit = evaluateLeveragedExposure(testPositions, aboveSoftBoundaryQuote, {
      softLimitPercent: 25.0,
      hardLimitPercent: 40.0,
    });
    const alphaAboveSoft = aboveSoftLimit.dimensions.find((d) => d.dimension === "issuer");
    expect(alphaAboveSoft?.resultingPercent).toBeGreaterThan(25.0);
    expect(alphaAboveSoft?.isSoftBreach).toBe(true);
  });

  it("filters alternatives so they strictly respect exposure limits", () => {
    // Current portfolio: Nordic Capital is already high (30%).
    // Proposing 10k order.
    // alt-norway uses Nordic Capital -> would result in > 25% exposure, so must be excluded!
    // alt-fra uses Parisian Credit (0% current) -> 10k / 110k = 9.09% <= 25%, so included!
    const quote: ProposedOrderQuote = {
      invoice_id: "inv-nordic",
      title: "Nordic Add",
      issuer: "Nordic Capital",
      debtor: "Oslo Port Corp",
      jurisdiction: "Norway",
      amount: 10000,
    };

    const res = evaluateLeveragedExposure(
      basePositions,
      quote,
      DEFAULT_EXPOSURE_LIMITS,
      sampleAlternatives,
    );

    expect(res.qualifiedAlternatives.length).toBe(1);
    expect(res.qualifiedAlternatives[0].id).toBe("alt-fra");
    expect(res.qualifiedAlternatives[0].resultingPercent).toBeLessThanOrEqual(25);
  });
});
