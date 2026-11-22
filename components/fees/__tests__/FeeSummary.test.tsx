import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FeeSummary } from "@/components/fees/FeeSummary";
import { BASE_NETWORK_FEE_XLM } from "@/lib/feeEstimate";
import type { FeeEstimateResult } from "@/hooks/useFeeEstimate";

const estimate = (overrides: Partial<FeeEstimateResult> = {}): FeeEstimateResult => ({
  networkFee: 0.002,
  platformFee: 1,
  total: 101.002,
  loading: false,
  usedFallback: false,
  insufficientBalance: false,
  reason: null,
  ...overrides,
});

describe("FeeSummary (#654)", () => {
  it("shows amount, platform fee, network fee and a matching total", () => {
    render(<FeeSummary amount={100} estimate={estimate()} />);

    expect(screen.getByTestId("fee-amount")).toHaveTextContent("100.0000000 XLM");
    expect(screen.getByTestId("fee-platform")).toHaveTextContent("1.0000000 XLM");
    expect(screen.getByTestId("fee-network")).toHaveTextContent("0.0020000 XLM");
    expect(screen.getByTestId("fee-total")).toHaveTextContent("101.0020000 XLM");
    expect(screen.getByTestId("fee-summary")).toHaveAttribute("aria-live", "polite");
  });

  it("shows a skeleton while estimating", () => {
    render(<FeeSummary amount={100} estimate={estimate({ loading: true })} />);
    expect(screen.getByTestId("fee-summary-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("fee-total")).not.toBeInTheDocument();
  });

  it("explains the base fee fallback without blocking", () => {
    render(
      <FeeSummary
        amount={100}
        estimate={estimate({ networkFee: BASE_NETWORK_FEE_XLM, usedFallback: true, total: 101.00001 })}
      />,
    );
    expect(screen.getByTestId("fee-fallback")).toBeInTheDocument();
    expect(screen.queryByTestId("fee-insufficient")).not.toBeInTheDocument();
  });

  it("announces insufficient balance as an alert", () => {
    render(
      <FeeSummary
        amount={100}
        estimate={estimate({
          insufficientBalance: true,
          reason: "Insufficient XLM: amount, fees and reserve exceed your balance.",
        })}
      />,
    );
    expect(screen.getByTestId("fee-insufficient")).toHaveTextContent("Insufficient XLM");
  });
});
