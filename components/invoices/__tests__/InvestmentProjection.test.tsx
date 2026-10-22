import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { InvestmentProjection } from "@/components/invoices/InvestmentProjection";

vi.mock("@/lib/api", () => ({
  fetchDynamicYield: vi.fn().mockResolvedValue({ current_rate: 10 }),
  fetchFeeSchedule: vi.fn().mockResolvedValue({ fees: [{
    fee_type: "investment_fee", applies_to: "investor", rate_percentage: 2,
  }] }),
  fetchXlmUsdRate: vi.fn().mockResolvedValue({ rate: 0.5 }),
}));

function Harness() {
  const [amountRaw, setAmountRaw] = useState("");
  return (
    <>
      <output data-testid="investment-amount">{amountRaw}</output>
      <input aria-label="Amount draft" value={amountRaw} onChange={(event) => setAmountRaw(event.target.value)} />
      <InvestmentProjection
        issuerWallet="GISSUER"
        invoiceYieldPercent={8}
        maturityDate={new Date(Date.now() + 100 * 86_400_000).toISOString()}
        fractionPrice={2}
        maxInvestment={1000}
        amountRaw={amountRaw}
        onAmountChange={setAmountRaw}
      />
    </>
  );
}

describe("InvestmentProjection", () => {
  it("syncs fractions with the investment amount and updates the USD estimate", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><Harness /></QueryClientProvider>);

    fireEvent.change(screen.getByTestId("projection-fractions"), { target: { value: "50" } });
    expect(screen.getByTestId("investment-amount")).toHaveTextContent("100");
    await waitFor(() => expect(screen.getByTestId("projection-net")).toHaveTextContent("$0.37"));
    expect(screen.getByTestId("projection-fee")).toHaveTextContent("$1.00");
    expect(screen.getByTestId("projection-percent")).toHaveTextContent("0.73%");

    fireEvent.change(screen.getByRole("textbox", { name: "Amount draft" }), { target: { value: "101" } });
    expect(screen.getByTestId("projection-fractions")).toHaveValue(50);
    expect(screen.getByTestId("projection-remainder")).toHaveTextContent("1.00 XLM");

    fireEvent.change(screen.getByRole("textbox", { name: "Amount draft" }), { target: { value: "1001" } });
    expect(screen.queryByTestId("projection-results")).not.toBeInTheDocument();
    expect(screen.getByTestId("projection-unavailable")).toHaveTextContent("exceeds");

    fireEvent.change(screen.getByRole("textbox", { name: "Amount draft" }), { target: { value: "100" } });

    fireEvent.change(screen.getByTestId("projection-hold"), { target: { value: "custom" } });
    const customDate = new Date(Date.now() + 50 * 86_400_000).toISOString().slice(0, 10);
    fireEvent.change(screen.getByTestId("projection-date"), { target: { value: customDate } });
    expect(screen.getByTestId("projection-gross")).toHaveTextContent("$0.68");
  });
});
