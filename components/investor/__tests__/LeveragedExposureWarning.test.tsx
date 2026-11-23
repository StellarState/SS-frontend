import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LeveragedExposureWarning } from "../LeveragedExposureWarning";
import type { ExposureEvaluationResult } from "@/lib/analytics/exposureLimits";

const mockEvaluationSafe: ExposureEvaluationResult = {
  currentTotal: 100000,
  proposedAmount: 10000,
  resultingTotal: 110000,
  dimensions: [
    {
      dimension: "issuer",
      key: "Acme",
      label: "Acme Corp",
      currentAmount: 10000,
      currentPercent: 10,
      resultingAmount: 20000,
      resultingPercent: 18.18,
      limitPercent: 25,
      isHardBreach: false,
      isSoftBreach: false,
    },
    {
      dimension: "debtor",
      key: "Debtor1",
      label: "Global Freight",
      currentAmount: 15000,
      currentPercent: 15,
      resultingAmount: 25000,
      resultingPercent: 22.73,
      limitPercent: 25,
      isHardBreach: false,
      isSoftBreach: false,
    },
    {
      dimension: "jurisdiction",
      key: "UK",
      label: "United Kingdom",
      currentAmount: 15000,
      currentPercent: 15,
      resultingAmount: 25000,
      resultingPercent: 22.73,
      limitPercent: 25,
      isHardBreach: false,
      isSoftBreach: false,
    },
  ],
  softBreaches: [],
  hardBreaches: [],
  isHardBlocked: false,
  requiresWarning: false,
  breachedDimensionDescriptions: [],
  qualifiedAlternatives: [
    {
      id: "alt-1",
      title: "Clean Energy Bond #101",
      issuer: "EcoPower",
      debtor: "City of Oslo",
      jurisdiction: "Norway",
      yieldPercent: 8.2,
      riskTier: "A",
      resultingPercent: 12.5,
    },
  ],
};

const mockEvaluationSoftBreach: ExposureEvaluationResult = {
  ...mockEvaluationSafe,
  requiresWarning: true,
  softBreaches: [
    {
      dimension: "debtor",
      key: "Debtor1",
      label: "Global Freight",
      currentAmount: 25000,
      currentPercent: 25,
      resultingAmount: 35000,
      resultingPercent: 31.82,
      limitPercent: 25,
      isHardBreach: false,
      isSoftBreach: true,
    },
  ],
  breachedDimensionDescriptions: ["Soft Warning: Debtor Global Freight exceeds 25%"],
};

const mockEvaluationHardBreach: ExposureEvaluationResult = {
  ...mockEvaluationSafe,
  isHardBlocked: true,
  hardBreaches: [
    {
      dimension: "issuer",
      key: "Acme",
      label: "Acme Corp",
      currentAmount: 40000,
      currentPercent: 40,
      resultingAmount: 60000,
      resultingPercent: 54.55,
      limitPercent: 40,
      isHardBreach: true,
      isSoftBreach: false,
    },
  ],
  breachedDimensionDescriptions: ["Hard Block: Issuer Acme Corp exceeds 40%"],
};

describe("LeveragedExposureWarning component", () => {
  it("renders utilisation metrics for issuer, debtor, and jurisdiction", () => {
    render(<LeveragedExposureWarning evaluation={mockEvaluationSafe} />);

    expect(screen.getByTestId("dimension-utilisation-issuer")).toHaveTextContent("Acme Corp");
    expect(screen.getByTestId("dimension-utilisation-debtor")).toHaveTextContent("Global Freight");
    expect(screen.getByTestId("dimension-utilisation-jurisdiction")).toHaveTextContent("United Kingdom");
    expect(screen.queryByTestId("hard-block-alert")).toBeNull();
    expect(screen.queryByTestId("soft-warning-alert")).toBeNull();
  });

  it("renders a hard block alert with breached dimensions when hard limit is exceeded", () => {
    render(<LeveragedExposureWarning evaluation={mockEvaluationHardBreach} />);

    expect(screen.getByTestId("hard-block-alert")).toBeInTheDocument();
    expect(screen.getByTestId("hard-breach-dimensions")).toHaveTextContent("Acme Corp");
    expect(screen.getByTestId("hard-breach-dimensions")).toHaveTextContent("54.55%");
  });

  it("renders a soft warning alert that is dismissible by the user", () => {
    const onDismiss = vi.fn();
    render(<LeveragedExposureWarning evaluation={mockEvaluationSoftBreach} onDismissSoftWarning={onDismiss} />);

    expect(screen.getByTestId("soft-warning-alert")).toBeInTheDocument();
    expect(screen.getByTestId("soft-breach-dimensions")).toHaveTextContent("Global Freight");

    const dismissBtn = screen.getByTestId("dismiss-soft-warning-btn");
    fireEvent.click(dismissBtn);

    expect(onDismiss).toHaveBeenCalled();
    expect(screen.getByTestId("soft-warning-alert")).toHaveTextContent(/Exposure Warning Acknowledged/i);
  });

  it("renders lower-risk alternatives and handles selection callback", () => {
    const onSelectAlt = vi.fn();
    render(
      <LeveragedExposureWarning
        evaluation={mockEvaluationSafe}
        onSelectAlternative={onSelectAlt}
      />,
    );

    expect(screen.getByTestId("exposure-alternatives-card")).toBeInTheDocument();
    expect(screen.getByTestId("alt-asset-alt-1")).toHaveTextContent("Clean Energy Bond #101");
    expect(screen.getByTestId("alt-asset-alt-1")).toHaveTextContent("Safe Resulting Exposure: 12.5%");

    const selectBtn = screen.getByTestId("select-alt-alt-1");
    fireEvent.click(selectBtn);
    expect(onSelectAlt).toHaveBeenCalledWith(
      expect.objectContaining({ id: "alt-1", title: "Clean Energy Bond #101" }),
    );
  });
});
