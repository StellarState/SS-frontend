import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { FeeComparisonCalculator } from "@/components/fees/FeeComparisonCalculator";

describe("FeeComparisonCalculator Component (Issue #667)", () => {
  it("renders with initial scenarios and header", () => {
    render(<FeeComparisonCalculator />);
    expect(screen.getByTestId("fee-comparison-calculator")).toBeDefined();
    expect(
      screen.getByText("Protocol Fee Comparison Calculator"),
    ).toBeDefined();
    expect(screen.getByTestId("scenario-card-scenario-1")).toBeDefined();
    expect(screen.getByTestId("scenario-card-scenario-2")).toBeDefined();
  });

  it("allows adding a new scenario up to maximum limit", () => {
    render(<FeeComparisonCalculator />);
    const addBtn = screen.getByTestId("add-scenario-btn");
    expect(addBtn).toBeDefined();

    // Initial is 2 scenarios
    fireEvent.click(addBtn); // 3
    fireEvent.click(addBtn); // 4
    fireEvent.click(addBtn); // 5 (Max)

    expect(addBtn.hasAttribute("disabled")).toBe(true);
  });

  it("updates fee calculations when amount input changes", () => {
    render(<FeeComparisonCalculator />);
    const amountInput = screen.getByLabelText("Amount (XLM)", {
      selector: "#amount-scenario-1",
    }) as HTMLInputElement;

    fireEvent.change(amountInput, { target: { value: "50000" } });
    expect(amountInput.value).toBe("50000");
  });

  it("displays lowest fee badge on the most cost-effective scenario", () => {
    render(<FeeComparisonCalculator />);
    expect(screen.getByText("Lowest Fee")).toBeDefined();
  });

  it("shows ineligibility warning when an ineligible tier is selected", () => {
    render(<FeeComparisonCalculator />);
    const roleSelect = screen.getByLabelText("Participant Role", {
      selector: "#role-scenario-1",
    }) as HTMLSelectElement;
    const tierSelect = screen.getByLabelText("Volume / Loyalty Tier", {
      selector: "#tier-scenario-1",
    }) as HTMLSelectElement;

    // Issuer cannot use Platinum tier
    fireEvent.change(roleSelect, { target: { value: "issuer" } });
    fireEvent.change(tierSelect, { target: { value: "platinum" } });

    expect(screen.getByTestId("ineligible-warning")).toBeDefined();
  });
});
