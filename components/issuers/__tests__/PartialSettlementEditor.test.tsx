import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PartialSettlementEditor } from "../PartialSettlementEditor";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("PartialSettlementEditor (#681)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders allocation input fields and displays initial balanced allocation", () => {
    render(<PartialSettlementEditor />);

    expect(screen.getByTestId("partial-settlement-editor-panel")).toBeInTheDocument();
    expect(screen.getByTestId("input-principal")).toBeInTheDocument();
    expect(screen.getByTestId("input-fees")).toBeInTheDocument();
    expect(screen.getByTestId("input-reserve")).toBeInTheDocument();

    // Default 3500 + 1000 + 500 = 5000 XLM is balanced
    expect(screen.getByTestId("allocation-validation-msg")).toHaveTextContent("Balanced: Total allocated exactly equals payment");
    expect(screen.getByTestId("badge-status-draft")).toHaveTextContent("Draft");
  });

  it("shows an over-allocation error when total exceeds payment amount and disables submission", () => {
    render(<PartialSettlementEditor />);

    const principalInput = screen.getByTestId("input-principal");
    // Change principal from 3500 to 4000 (total = 4000 + 1000 + 500 = 5500 > 5000)
    fireEvent.change(principalInput, { target: { value: "4000" } });

    expect(screen.getByTestId("allocation-validation-msg")).toHaveTextContent("Allocation exceeds payment by 500.0000 XLM (over-allocated)");
    expect(screen.getByTestId("btn-request-approval")).toBeDisabled();
  });

  it("shows an under-allocation error when total is less than payment amount", () => {
    render(<PartialSettlementEditor />);

    const reserveInput = screen.getByTestId("input-reserve");
    // Change reserve from 500 to 100 (total = 3500 + 1000 + 100 = 4600 < 5000)
    fireEvent.change(reserveInput, { target: { value: "100" } });

    expect(screen.getByTestId("allocation-validation-msg")).toHaveTextContent("Allocation has 400.0000 XLM unassigned (under-allocated)");
    expect(screen.getByTestId("btn-request-approval")).toBeDisabled();
  });

  it("renders per-position pro-rata investor distribution table reconciling to total payouts", () => {
    render(<PartialSettlementEditor />);

    const table = screen.getByTestId("distribution-preview-table");
    expect(table).toBeInTheDocument();

    // Investor Alpha has 50% ratio
    const alphaRow = screen.getByTestId("pos-row-GBINVESTOR_ALPHA_01");
    expect(alphaRow).toHaveTextContent("GBINVESTOR_ALPHA_01");
    expect(alphaRow).toHaveTextContent("50.0%");
    // 3500 * 0.5 = 1750.00 principal, 1000 * 0.5 = 500.00 fees -> 2250.00 net
    expect(alphaRow).toHaveTextContent("1750.00 XLM");
    expect(alphaRow).toHaveTextContent("500.00 XLM");
    expect(alphaRow).toHaveTextContent("2250.00 XLM");
  });

  it("progresses through authorized approval workflow and generates matching settlement receipt", () => {
    render(<PartialSettlementEditor currentUserAddress="GBISSUER_ADMIN_KEY_01" />);

    // 1. Submit for approval
    const requestBtn = screen.getByTestId("btn-request-approval");
    expect(requestBtn).not.toBeDisabled();
    fireEvent.click(requestBtn);

    // 2. Pending approval state is visible
    expect(screen.getByTestId("badge-status-pending")).toHaveTextContent("Pending Authorised Approval");
    expect(screen.getByTestId("btn-authorize-approval")).toBeInTheDocument();

    // 3. Authorize approval
    fireEvent.click(screen.getByTestId("btn-authorize-approval"));

    // 4. Approved state and final receipt appear
    expect(screen.getByTestId("badge-status-approved")).toHaveTextContent("Approved");
    expect(screen.getByTestId("settlement-receipt-view")).toBeInTheDocument();
    expect(screen.getByText(/Final Settlement Receipt #rcpt-/)).toBeInTheDocument();
    expect(screen.getByText("GBISSUER_ADMIN_KEY_01")).toBeInTheDocument();
  });

  it("auto-balances reserve correctly when clicked", () => {
    render(<PartialSettlementEditor />);

    // Set principal to 3000, fees to 1000, reserve to 0 -> total 4000 (1000 under)
    fireEvent.change(screen.getByTestId("input-principal"), { target: { value: "3000" } });
    fireEvent.change(screen.getByTestId("input-fees"), { target: { value: "1000" } });
    fireEvent.change(screen.getByTestId("input-reserve"), { target: { value: "0" } });

    expect(screen.getByTestId("allocation-validation-msg")).toHaveTextContent("unassigned");

    // Click auto-balance
    fireEvent.click(screen.getByTestId("btn-auto-balance"));

    // Reserve should be updated to 1000 and balanced
    expect(screen.getByTestId("allocation-validation-msg")).toHaveTextContent("Balanced");
  });
});
