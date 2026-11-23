import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DistributionStatementsTab } from "../DistributionStatementsTab";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    address: "GCKX6ZIFGPDAUBC7S67YP2AQQVXN2EPHSZ7JAAPIKVWZHWLP6Y2XULT2",
    jwt: "mock-jwt",
  })),
}));

describe("DistributionStatementsTab", () => {
  it("renders statements table with estimated and final badges", () => {
    render(
      <DistributionStatementsTab
        keyId="alpha-key"
        keyTitle="Alpha Key"
        heldKeys={25}
      />
    );

    expect(
      screen.getByTestId("distribution-statements-tab")
    ).toBeInTheDocument();
    expect(screen.getByText(/Distribution Tax & Accounting Statements/i)).toBeInTheDocument();
    expect(screen.getAllByTestId("badge-final").length).toBeGreaterThan(0);
    expect(screen.getByTestId("badge-estimated")).toBeInTheDocument();
  });

  it("opens details modal and displays full line-item tax and fee reconciliation", () => {
    render(
      <DistributionStatementsTab
        keyId="alpha-key"
        keyTitle="Alpha Key"
        heldKeys={25}
      />
    );

    const detailButtons = screen.getAllByText("Details");
    fireEvent.click(detailButtons[0]);

    const modal = screen.getByTestId("statement-detail-modal");
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByText("Accounting Statement")).toBeInTheDocument();
    expect(within(modal).getByText(/Protocol Fee \(2%\)/i)).toBeInTheDocument();
    expect(within(modal).getByText(/Withholding Tax \(15%\)/i)).toBeInTheDocument();
    expect(within(modal).getByText("Net Payout:")).toBeInTheDocument();
  });

  it("triggers CSV download without throwing", () => {
    // Mock URL.createObjectURL and link.click
    const createObjectURLMock = vi.fn(() => "blob:mock-url");
    const revokeObjectURLMock = vi.fn();
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;

    render(
      <DistributionStatementsTab
        keyId="alpha-key"
        keyTitle="Alpha Key"
        heldKeys={25}
      />
    );

    const exportBtn = screen.getByTestId("export-all-csv-btn");
    fireEvent.click(exportBtn);

    expect(createObjectURLMock).toHaveBeenCalled();
  });
});
