import { act, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ListPositionButton } from "../ListPositionButton";
import type { InvestmentPosition } from "@/lib/portfolio";

const position: InvestmentPosition = {
  invoice_id: "inv-1",
  invoice_title: "Acme receivable",
  committed_amount: 1000,
  status: "active",
  quantity: 10,
  lockup_expires_at: "2026-11-23T12:00:30.000Z",
};

function renderButton() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ListPositionButton position={position} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe("ListPositionButton lock-up", () => {
  it("disables listing with a lock-up tooltip until the expiry time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-23T12:00:00.000Z"));
    renderButton();

    expect(screen.getByRole("button", { name: "List for resale" })).toBeDisabled();
    expect(screen.getByTestId("list-position-lock-tooltip-trigger")).toHaveAttribute(
      "aria-label",
      expect.stringContaining("cannot be listed until"),
    );

    act(() => {
      vi.advanceTimersByTime(30_001);
    });

    expect(screen.getByTestId("list-position-button")).toBeEnabled();
  });
});
