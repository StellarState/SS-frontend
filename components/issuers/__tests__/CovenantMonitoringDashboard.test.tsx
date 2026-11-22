import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CovenantMonitoringDashboard } from "../CovenantMonitoringDashboard";

describe("CovenantMonitoringDashboard (#678)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders summary metrics bar and all covenant cards with units and values", () => {
    render(<CovenantMonitoringDashboard />);

    expect(screen.getByTestId("covenant-monitoring-dashboard")).toBeInTheDocument();
    expect(screen.getByTestId("summary-metrics-bar")).toHaveTextContent("Total Covenants3");

    // DSCR card
    const dscrCard = screen.getByTestId("covenant-card-cov-dscr");
    expect(dscrCard).toHaveTextContent("Debt Service Coverage Ratio (DSCR)");
    expect(dscrCard).toHaveTextContent("1.55 x");
    expect(dscrCard).toHaveTextContent("≥ 1.25 x");
    expect(screen.getByTestId("badge-status-cov-dscr")).toHaveTextContent("Healthy");

    // Leverage card
    const levCard = screen.getByTestId("covenant-card-cov-leverage");
    expect(levCard).toHaveTextContent("Maximum Leverage Ratio");
    expect(levCard).toHaveTextContent("3.25 x");
    expect(screen.getByTestId("badge-status-cov-leverage")).toHaveTextContent("Warning Pre-Breach");
  });

  it("displays breach state and active cure countdown for breached covenants", () => {
    render(<CovenantMonitoringDashboard />);

    const breachedCard = screen.getByTestId("covenant-card-cov-liquidity");
    expect(breachedCard).toHaveTextContent("Minimum Unencumbered Working Capital");
    expect(screen.getByTestId("badge-status-cov-liquidity")).toHaveTextContent("Breached (Cure Active)");

    // Countdown timer is visible
    expect(screen.getByTestId("cure-countdown-cov-liquidity")).toBeInTheDocument();
  });

  it("opens secure evidence viewer modal on document click and displays verified CID and hash", () => {
    render(<CovenantMonitoringDashboard />);

    // Click on DSCR certificate
    const viewBtn = screen.getByTestId("btn-view-evidence-doc-dscr-q3");
    fireEvent.click(viewBtn);

    // Secure modal should appear
    const modal = screen.getByTestId("secure-evidence-modal");
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveTextContent("Q3 Debt Service Reconciliation Certificate");
    expect(screen.getByText("bafybeidscrcertq3hash2026")).toBeInTheDocument();
    expect(screen.getByText(/a4f89d31c890123efb672198425dce88/)).toBeInTheDocument();

    // Close modal
    fireEvent.click(screen.getByTestId("btn-close-modal"));
    expect(screen.queryByTestId("secure-evidence-modal")).not.toBeInTheDocument();
  });

  it("toggles authorised investor view to reveal or restrict sensitive cure details and evidence", () => {
    render(<CovenantMonitoringDashboard defaultIsAuthorized={true} />);

    // In authorized view, cure plan is visible
    expect(screen.getByTestId("cure-plan-cov-liquidity")).toHaveTextContent("30,000 XLM reserve deposit");

    // Toggle off authorized view
    const toggle = screen.getByTestId("investor-mode-toggle");
    fireEvent.click(toggle);

    // In public view, cure plan is restricted
    expect(screen.queryByTestId("cure-plan-cov-liquidity")).not.toBeInTheDocument();
    expect(screen.getByText(/Cure remediation details restricted to authorised investor groups/)).toBeInTheDocument();
  });
});
