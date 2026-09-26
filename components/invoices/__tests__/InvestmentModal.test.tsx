import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { InvestmentModal } from "../InvestmentModal";
import { AccreditationProvider } from "@/context/AccreditationContext";

vi.mock("@/lib/api", () => ({
  investInInvoice: vi.fn().mockResolvedValue({ success: true, invested_amount: 100 }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), loading: vi.fn() },
}));

function renderModal() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AccreditationProvider>
        <InvestmentModal
          invoiceId="inv-1"
          minInvestment={1}
          maxInvestment={1000}
        />
      </AccreditationProvider>
    </QueryClientProvider>
  );
}

describe("InvestmentModal - accreditation gate (issue #312)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the accreditation gate instead of the investment form on first click", () => {
    renderModal();

    fireEvent.click(screen.getByTestId("invest-button"));

    expect(screen.getByTestId("accreditation-gate-modal")).toBeInTheDocument();
    expect(
      screen.queryByText("Invest in this Invoice")
    ).not.toBeInTheDocument();
  });

  it("reveals the investment form only after all disclosure steps are acknowledged", () => {
    renderModal();

    fireEvent.click(screen.getByTestId("invest-button"));
    fireEvent.click(screen.getByTestId("accreditation-step-next")); // risk -> platform rules
    fireEvent.click(screen.getByTestId("accreditation-step-next")); // platform rules -> confirmation
    fireEvent.click(screen.getByTestId("accreditation-step-next")); // confirm

    expect(screen.getByText("Invest in this Invoice")).toBeInTheDocument();
    expect(
      screen.queryByTestId("accreditation-gate-modal")
    ).not.toBeInTheDocument();
  });

  it("does not re-show the gate on a second investment attempt in the same session", async () => {
    renderModal();

    fireEvent.click(screen.getByTestId("invest-button"));
    fireEvent.click(screen.getByTestId("accreditation-step-next"));
    fireEvent.click(screen.getByTestId("accreditation-step-next"));
    fireEvent.click(screen.getByTestId("accreditation-step-next"));

    // Close and reopen the popover.
    fireEvent.click(screen.getByText("Cancel"));
    fireEvent.click(screen.getByTestId("invest-button"));

    expect(screen.getByText("Invest in this Invoice")).toBeInTheDocument();
    expect(
      screen.queryByTestId("accreditation-gate-modal")
    ).not.toBeInTheDocument();
  });
});
