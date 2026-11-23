import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReserveTargetPlanner } from "../ReserveTargetPlanner";

describe("ReserveTargetPlanner", () => {
  it("renders KPIs, obligations, and threshold alerts for shortfall", () => {
    render(
      <ReserveTargetPlanner
        initialBalance={5000}
        currency="USDC"
      />
    );

    expect(screen.getByTestId("reserve-target-planner")).toBeInTheDocument();
    expect(screen.getByText("Issuer Liquidity Reserve Target Planner")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-current-balance")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-upcoming-obligations")).toBeInTheDocument();

    // Check threshold warnings container
    expect(screen.getByTestId("threshold-warnings-container")).toBeInTheDocument();
  });

  it("allows adding and removing a scheduled contribution", () => {
    render(
      <ReserveTargetPlanner
        initialBalance={10000}
        initialContributions={[]}
        currency="USDC"
      />
    );

    const amountInput = screen.getByTestId("input-contrib-amount");
    const descInput = screen.getByTestId("input-contrib-desc");
    const addBtn = screen.getByTestId("add-contribution-btn");

    fireEvent.change(amountInput, { target: { value: "30000" } });
    fireEvent.change(descInput, { target: { value: "Q4 settlement fund" } });
    fireEvent.click(addBtn);

    expect(screen.getByText(/Q4 settlement fund/)).toBeInTheDocument();

    // Remove the contribution
    const removeBtn = screen.getByRole("button", { name: /Remove contribution/i });
    fireEvent.click(removeBtn);

    expect(screen.queryByText(/Q4 settlement fund/)).not.toBeInTheDocument();
  });

  it("stops shortfall warnings and displays funded banner when target is met", () => {
    // 200,000 USDC easily covers the obligations (~112,000 USDC)
    render(
      <ReserveTargetPlanner
        initialBalance={200000}
        currency="USDC"
      />
    );

    expect(screen.getByTestId("target-funded-banner")).toBeInTheDocument();
    expect(screen.getByText("Reserve Target Met")).toBeInTheDocument();
    expect(screen.queryByTestId("threshold-warnings-container")).not.toBeInTheDocument();
  });

  it("triggers CSV export without crashing", () => {
    const createObjectURLMock = vi.fn(() => "blob:mock-url");
    const revokeObjectURLMock = vi.fn();
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;

    render(<ReserveTargetPlanner initialBalance={10000} />);

    const exportBtn = screen.getByTestId("export-reserve-plan-csv");
    fireEvent.click(exportBtn);

    expect(createObjectURLMock).toHaveBeenCalled();
  });
});
