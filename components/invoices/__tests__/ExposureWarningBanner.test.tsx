import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExposureWarningBanner } from "../ExposureWarningBanner";
import type { ExposureEvaluation } from "@/lib/analytics/exposureLimits";

const mockHardBlockEvaluation: ExposureEvaluation = {
  totalCurrentPortfolio: 100000,
  totalResultingPortfolio: 160000,
  proposedAmount: 60000,
  dimensions: [
    {
      dimension: "issuer",
      dimensionKey: "G_ISSUER_HIGH",
      currentPrincipal: 50000,
      currentSharePercent: 50,
      resultingPrincipal: 110000,
      resultingSharePercent: 68.75,
      softLimitPercent: 25,
      hardLimitPercent: 40,
      status: "hard_block",
      breachMessage: "ISSUER limit breached: 68.8% exceeds hard limit of 40%",
    },
    {
      dimension: "debtor",
      dimensionKey: "Debtor Safe",
      currentPrincipal: 10000,
      currentSharePercent: 10,
      resultingPrincipal: 70000,
      resultingSharePercent: 43.75,
      softLimitPercent: 25,
      hardLimitPercent: 40,
      status: "hard_block",
      breachMessage: "DEBTOR limit breached: 43.8% exceeds hard limit of 40%",
    },
    {
      dimension: "jurisdiction",
      dimensionKey: "United States",
      currentPrincipal: 10000,
      currentSharePercent: 10,
      resultingPrincipal: 70000,
      resultingSharePercent: 43.75,
      softLimitPercent: 25,
      hardLimitPercent: 40,
      status: "hard_block",
    },
  ],
  isHardBlocked: true,
  hasSoftWarning: false,
  breachedHardDimensions: [
    {
      dimension: "issuer",
      dimensionKey: "G_ISSUER_HIGH",
      currentPrincipal: 50000,
      currentSharePercent: 50,
      resultingPrincipal: 110000,
      resultingSharePercent: 68.75,
      softLimitPercent: 25,
      hardLimitPercent: 40,
      status: "hard_block",
    },
  ],
  breachedSoftDimensions: [],
  alternativeRecommendations: [
    {
      id: "alt-singapore",
      title: "Singapore Tech Note",
      issuer: "G_ISSUER_SAFE",
      debtor: "Debtor SG",
      jurisdiction: "Singapore",
      yield_rate: 11.5,
      remaining_capacity: 50000,
    },
  ],
};

const mockSoftWarningEvaluation: ExposureEvaluation = {
  totalCurrentPortfolio: 100000,
  totalResultingPortfolio: 110000,
  proposedAmount: 10000,
  dimensions: [
    {
      dimension: "debtor",
      dimensionKey: "Debtor Alpha",
      currentPrincipal: 25000,
      currentSharePercent: 25,
      resultingPrincipal: 35000,
      resultingSharePercent: 31.82,
      softLimitPercent: 25,
      hardLimitPercent: 40,
      status: "soft_warning",
    },
  ],
  isHardBlocked: false,
  hasSoftWarning: true,
  breachedHardDimensions: [],
  breachedSoftDimensions: [
    {
      dimension: "debtor",
      dimensionKey: "Debtor Alpha",
      currentPrincipal: 25000,
      currentSharePercent: 25,
      resultingPrincipal: 35000,
      resultingSharePercent: 31.82,
      softLimitPercent: 25,
      hardLimitPercent: 40,
      status: "soft_warning",
    },
  ],
  alternativeRecommendations: [],
};

const mockSafeEvaluation: ExposureEvaluation = {
  totalCurrentPortfolio: 100000,
  totalResultingPortfolio: 105000,
  proposedAmount: 5000,
  dimensions: [],
  isHardBlocked: false,
  hasSoftWarning: false,
  breachedHardDimensions: [],
  breachedSoftDimensions: [],
  alternativeRecommendations: [],
};

describe("ExposureWarningBanner Component (#689)", () => {
  it("renders hard block with breached dimensions and lower-risk alternatives", () => {
    render(<ExposureWarningBanner evaluation={mockHardBlockEvaluation} />);

    expect(screen.getByTestId("hard-exposure-block")).toBeInTheDocument();
    expect(screen.getByTestId("breached-dimension-issuer")).toBeInTheDocument();
    expect(screen.getByText(/G_ISSUER_HIGH/i)).toBeInTheDocument();
    expect(screen.getByText(/68.75%/i)).toBeInTheDocument();

    // Recommends alternatives
    expect(screen.getByTestId("exposure-alternatives-card")).toBeInTheDocument();
    expect(screen.getByText("Singapore Tech Note")).toBeInTheDocument();
    expect(screen.getByTestId("view-alt-alt-singapore")).toHaveAttribute(
      "href",
      "/marketplace/alt-singapore",
    );
  });

  it("renders dismissible soft warning and triggers onDismiss callback", () => {
    const onDismiss = vi.fn();
    render(<ExposureWarningBanner evaluation={mockSoftWarningEvaluation} onDismiss={onDismiss} />);

    expect(screen.getByTestId("soft-exposure-warning")).toBeInTheDocument();
    expect(screen.getByText(/Debtor Alpha/i)).toBeInTheDocument();

    const dismissBtn = screen.getByTestId("dismiss-soft-warning-btn");
    fireEvent.click(dismissBtn);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("hides soft warning when dismissed", () => {
    render(<ExposureWarningBanner evaluation={mockSoftWarningEvaluation} isDismissed={true} />);
    expect(screen.queryByTestId("soft-exposure-warning")).not.toBeInTheDocument();
  });

  it("renders nothing when evaluation is safe", () => {
    const { container } = render(<ExposureWarningBanner evaluation={mockSafeEvaluation} />);
    expect(container.firstChild).toBeNull();
  });
});
