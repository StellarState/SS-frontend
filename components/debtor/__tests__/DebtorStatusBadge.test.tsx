import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DebtorStatusBadge } from "../DebtorStatusBadge";
import type { DebtorStatus } from "@/lib/api/debtorStatus";

const { mockUseDebtorStatus } = vi.hoisted(() => ({
  mockUseDebtorStatus: vi.fn(),
}));

vi.mock("@/hooks/useDebtorStatus", () => ({ useDebtorStatus: mockUseDebtorStatus }));

beforeEach(() => {
  mockUseDebtorStatus.mockReturnValue({ data: { status: "Neutral", history: [] } });
});

describe("DebtorStatusBadge (#606)", () => {
  it.each(["Trusted", "Neutral", "Watch", "Blocked"] as DebtorStatus[])(
    "renders the %s status badge",
    (status) => {
      mockUseDebtorStatus.mockReturnValue({ data: { status, history: [] } });
      render(<DebtorStatusBadge debtorHash="GDEBTOR" />);
      expect(screen.getByTestId("debtor-status-badge")).toHaveTextContent(status);
    }
  );

  it("shows an unknown debtor as Neutral", () => {
    render(<DebtorStatusBadge />);
    expect(screen.getByTestId("debtor-status-badge")).toHaveTextContent("Neutral");
  });

  it("lists recent status changes in a popover", async () => {
    const user = userEvent.setup();
    mockUseDebtorStatus.mockReturnValue({
      data: {
        status: "Watch",
        history: [
          { from: "Neutral", to: "Watch", changedAt: "2026-11-10T00:00:00Z" },
          { from: "Trusted", to: "Neutral", changedAt: "2026-10-01T00:00:00Z" },
        ],
      },
    });

    render(<DebtorStatusBadge debtorHash="GDEBTOR" />);
    await user.click(screen.getByTestId("debtor-status-badge"));

    const history = await screen.findByTestId("debtor-status-history");
    expect(history).toHaveTextContent("Neutral to Watch");
    expect(history).toHaveTextContent("Trusted to Neutral");
  });
});
