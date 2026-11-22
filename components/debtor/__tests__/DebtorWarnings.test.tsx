import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BlockedDebtorNotice } from "../BlockedDebtorNotice";
import { WatchWarning } from "../WatchWarning";

const { mockUseDebtorStatus } = vi.hoisted(() => ({
  mockUseDebtorStatus: vi.fn(),
}));

vi.mock("@/hooks/useDebtorStatus", () => ({ useDebtorStatus: mockUseDebtorStatus }));

beforeEach(() => {
  mockUseDebtorStatus.mockReturnValue({ data: { status: "Neutral", history: [] } });
});

describe("debtor warnings (#606)", () => {
  it("explains extra safeguards for watch debtors", () => {
    mockUseDebtorStatus.mockReturnValue({ data: { status: "Watch", history: [] } });
    render(<WatchWarning debtorHash="GDEBTOR" />);
    expect(screen.getByTestId("watch-warning")).toHaveTextContent("acknowledge the risk");
  });

  it("hides the warning for trusted and unknown debtors", () => {
    mockUseDebtorStatus.mockReturnValue({ data: { status: "Trusted", history: [] } });
    const { rerender } = render(<WatchWarning debtorHash="GDEBTOR" />);
    expect(screen.queryByTestId("watch-warning")).not.toBeInTheDocument();

    mockUseDebtorStatus.mockReturnValue({ data: undefined });
    rerender(<WatchWarning debtorHash="GDEBTOR" />);
    expect(screen.queryByTestId("watch-warning")).not.toBeInTheDocument();
  });

  it("blocks publishing with a clear message for blocked debtors", () => {
    mockUseDebtorStatus.mockReturnValue({ data: { status: "Blocked", history: [] } });
    render(<BlockedDebtorNotice debtorHash="GDEBTOR" />);
    expect(screen.getByTestId("blocked-debtor-notice")).toHaveTextContent(
      "cannot publish a new invoice"
    );
  });
});
