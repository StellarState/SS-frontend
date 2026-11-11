import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReturnsCalculator } from "@/components/invoices/ReturnsCalculator";

const future = new Date(Date.now() + 73 * 86_400_000 - 3_600_000).toISOString();
const customFuture = new Date(Date.now() + 30 * 86_400_000).toISOString().split("T")[0];

describe("ReturnsCalculator", () => {
  it("updates outputs on every keypress with synchronized fraction count", async () => {
    render(
      <ReturnsCalculator
        faceValue={10_000}
        yieldPercentage={12}
        maturityDate={future}
        fractionPrice={1}
      />
    );
    const input = screen.getByTestId("returns-amount-input");
    await userEvent.type(input, "1");
    expect(screen.getByTestId("returns-fractions")).toHaveTextContent("1");
    await userEvent.type(input, "000");
    expect(screen.getByTestId("returns-fractions")).toHaveTextContent("1,000");
    expect(screen.getByTestId("returns-share")).toHaveTextContent("10.00%");
    expect(screen.getByTestId("returns-gross")).toHaveTextContent("24.00 XLM");
    expect(screen.getByTestId("returns-net")).toHaveTextContent("+24.00 XLM");
  });

  it("shows methodology tooltip on focus", async () => {
    render(<ReturnsCalculator faceValue={100} yieldPercentage={10} maturityDate={future} />);
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.hover(screen.getByTestId("returns-methodology-trigger"));
    expect((await screen.findAllByText(/pro-rata share/i)).length).toBeGreaterThan(0);
  });

  it("displays issuer dynamic yield when available and calculates returns using dynamic rate", async () => {
    render(
      <ReturnsCalculator
        faceValue={10_000}
        yieldPercentage={10}
        dynamicYieldPercentage={15}
        maturityDate={future}
        fractionPrice={1}
      />
    );
    expect(screen.getByTestId("returns-yield-source")).toHaveTextContent(/Issuer dynamic yield: 15%/i);

    const input = screen.getByTestId("returns-amount-input");
    await userEvent.type(input, "1000");
    // 1000 * 0.15 * (73/365) = 30 XLM
    expect(screen.getByTestId("returns-gross")).toHaveTextContent("30.00 XLM");
  });

  it("calculates platform fee deduction and net ROI", async () => {
    render(
      <ReturnsCalculator
        faceValue={10_000}
        yieldPercentage={12}
        feeRatePercentage={5} // 5% fee on yield
        maturityDate={future}
        fractionPrice={1}
      />
    );
    const input = screen.getByTestId("returns-amount-input");
    await userEvent.type(input, "1000");

    // Gross: 24 XLM, Fee: 1.20 XLM, Net: 22.80 XLM, Net ROI: 2.28%
    expect(screen.getByTestId("returns-gross")).toHaveTextContent("24.00 XLM");
    expect(screen.getByTestId("returns-fee")).toHaveTextContent("-1.20 XLM");
    expect(screen.getByTestId("returns-net")).toHaveTextContent("+22.80 XLM");
    expect(screen.getByTestId("returns-roi")).toHaveTextContent("2.28%");
  });

  it("calculates USD values when xlmUsdRate is provided", async () => {
    render(
      <ReturnsCalculator
        faceValue={10_000}
        yieldPercentage={12}
        xlmUsdRate={0.15}
        maturityDate={future}
        fractionPrice={1}
      />
    );
    const input = screen.getByTestId("returns-amount-input");
    await userEvent.type(input, "1000");

    // Net return: 24 XLM * $0.15 = $3.60 USD
    expect(screen.getByTestId("returns-net-usd")).toHaveTextContent("$3.60 USD");
  });

  it("supports switching to custom hold date shorter than maturity", async () => {
    render(
      <ReturnsCalculator
        faceValue={10_000}
        yieldPercentage={12}
        maturityDate={future}
        fractionPrice={1}
      />
    );
    const customBtn = screen.getByTestId("returns-hold-custom-btn");
    await userEvent.click(customBtn);

    const dateInput = screen.getByTestId("returns-custom-date-input");
    await userEvent.type(dateInput, customFuture);

    const input = screen.getByTestId("returns-amount-input");
    await userEvent.type(input, "1000");

    expect(screen.getByTestId("returns-days-summary")).toHaveTextContent(/Projection based on/i);
  });

  it("displays remainder on non-whole-fraction amounts and overcap warning", async () => {
    render(
      <ReturnsCalculator
        faceValue={10_000}
        fundingCap={500}
        yieldPercentage={12}
        maturityDate={future}
        fractionPrice={3}
      />
    );
    const input = screen.getByTestId("returns-amount-input");
    await userEvent.type(input, "10"); // 3 fractions * 3 = 9, remainder = 1

    expect(screen.getByTestId("returns-fractions")).toHaveTextContent("3");
    expect(screen.getByTestId("returns-remainder")).toHaveTextContent("Remainder: 1.00 XLM");

    // Over-cap:
    await userEvent.clear(input);
    await userEvent.type(input, "600");
    expect(screen.getByTestId("returns-overcap-warning")).toBeInTheDocument();
  });
});
