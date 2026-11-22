import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { DistributionStatementsPanel } from "../DistributionStatementsPanel";
import { SAMPLE_DISTRIBUTION_STATEMENTS } from "@/lib/analytics/distributionStatements";
import * as authHook from "@/hooks/useAuth";
import * as walletHook from "@/hooks/useStellarWallet";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/useStellarWallet", () => ({
  useStellarWallet: vi.fn(),
}));

describe("DistributionStatementsPanel component (#693)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authHook.useAuth).mockReturnValue({
      address: "GDUSC4MAINNETESCROWSETTLEPOOL2026771ABCDEF1234567890STLT",
      jwt: "mock-jwt-token",
    } as unknown as ReturnType<typeof authHook.useAuth>);
    vi.mocked(walletHook.useStellarWallet).mockReturnValue({
      address: "GDUSC4MAINNETESCROWSETTLEPOOL2026771ABCDEF1234567890STLT",
    } as unknown as ReturnType<typeof walletHook.useStellarWallet>);
  });

  it("renders distribution statements panel, totals summary, and table", () => {
    render(<DistributionStatementsPanel keyId="creator-key-solaris-1" />);

    expect(screen.getByTestId("distribution-statements-panel")).toBeInTheDocument();
    expect(screen.getByTestId("total-net-value")).toBeInTheDocument();
    expect(screen.getByTestId("total-gross-value")).toBeInTheDocument();
    expect(screen.getByTestId("total-taxes-value")).toBeInTheDocument();
    expect(screen.getByTestId("reconciliation-badge")).toHaveTextContent("100% Reconciled");

    // Table rows
    expect(screen.getByTestId("statement-row-STMT-2026-Q3-001")).toBeInTheDocument();
    expect(screen.getByTestId("statement-row-STMT-2026-OCT-002")).toBeInTheDocument();
    expect(screen.getByTestId("statement-row-STMT-2026-NOV-EST")).toBeInTheDocument();

    // Badges
    expect(screen.getByTestId("badge-status-final-STMT-2026-Q3-001")).toHaveTextContent("Finalized");
    expect(screen.getByTestId("badge-status-estimated-STMT-2026-NOV-EST")).toHaveTextContent("Estimated");
  });

  it("filters statements by period type", () => {
    render(<DistributionStatementsPanel keyId="creator-key-solaris-1" />);

    // Click Final Quarters
    fireEvent.click(screen.getByTestId("filter-period-final"));
    expect(screen.getByTestId("statement-row-STMT-2026-Q3-001")).toBeInTheDocument();
    expect(screen.queryByTestId("statement-row-STMT-2026-NOV-EST")).not.toBeInTheDocument();

    // Click Partial Periods
    fireEvent.click(screen.getByTestId("filter-period-partial"));
    expect(screen.queryByTestId("statement-row-STMT-2026-Q3-001")).not.toBeInTheDocument();
    expect(screen.getByTestId("statement-row-STMT-2026-NOV-EST")).toBeInTheDocument();
  });

  it("filters statements by status (finalized vs estimated)", () => {
    render(<DistributionStatementsPanel keyId="creator-key-solaris-1" />);

    // Click Estimated
    fireEvent.click(screen.getByTestId("filter-status-estimated"));
    expect(screen.queryByTestId("statement-row-STMT-2026-Q3-001")).not.toBeInTheDocument();
    expect(screen.getByTestId("statement-row-STMT-2026-NOV-EST")).toBeInTheDocument();

    // Click Finalized
    fireEvent.click(screen.getByTestId("filter-status-final"));
    expect(screen.getByTestId("statement-row-STMT-2026-Q3-001")).toBeInTheDocument();
    expect(screen.queryByTestId("statement-row-STMT-2026-NOV-EST")).not.toBeInTheDocument();
  });

  it("filters statements by search input", () => {
    render(<DistributionStatementsPanel keyId="creator-key-solaris-1" />);

    const searchInput = screen.getByTestId("input-search-statements");
    fireEvent.change(searchInput, { target: { value: "October" } });

    expect(screen.getByTestId("statement-row-STMT-2026-OCT-002")).toBeInTheDocument();
    expect(screen.queryByTestId("statement-row-STMT-2026-Q3-001")).not.toBeInTheDocument();
  });

  it("triggers CSV and PDF downloads when authorized", () => {
    const createElementSpy = vi.spyOn(document, "createElement");

    render(<DistributionStatementsPanel keyId="creator-key-solaris-1" />);

    fireEvent.click(screen.getByTestId("btn-download-csv"));
    expect(createElementSpy).toHaveBeenCalledWith("a");

    fireEvent.click(screen.getByTestId("btn-download-pdf"));
    expect(createElementSpy).toHaveBeenCalledWith("a");
  });

  it("shows authorization alert and warning when user is unauthenticated", () => {
    vi.mocked(authHook.useAuth).mockReturnValue({
      address: null,
      jwt: null,
    } as unknown as ReturnType<typeof authHook.useAuth>);

    // Also unmock wallet address
    vi.mocked(walletHook.useStellarWallet).mockReturnValue({
      address: null,
    } as unknown as ReturnType<typeof walletHook.useStellarWallet>);

    render(
      <DistributionStatementsPanel
        keyId="creator-key-solaris-1"
        initialOptions={{
          initialStatements: SAMPLE_DISTRIBUTION_STATEMENTS,
        }}
      />
    );

    // Expect alert
    expect(screen.getByTestId("auth-required-alert")).toBeInTheDocument();
    expect(screen.getByText(/Authorisation Required/)).toBeInTheDocument();
  });
});
