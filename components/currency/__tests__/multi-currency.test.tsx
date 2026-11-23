import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { CurrencyToggle } from "@/components/layout/CurrencyToggle";
import { ExchangeRateDisclaimer, Money } from "@/components/currency";
import { CURRENCY_STORAGE_KEY } from "@/lib/currency";

vi.mock("@/lib/api", () => ({ fetchFxRates: vi.fn(), fetchXlmUsdRate: vi.fn() }));

function renderApp(updatedAt = Date.now()) {
  const fetchRates = vi.fn().mockResolvedValue({
    rates: { USD: 0.25, EUR: 0.2, GBP: 0.18, KES: 32.5, NGN: 400 },
    updatedAt,
  });
  return render(
    <CurrencyProvider fetchRates={fetchRates}>
      <CurrencyToggle />
      <Money xlm={1000} />
      <ExchangeRateDisclaimer />
    </CurrencyProvider>,
  );
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("multi-currency display (#504)", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.useRealTimers());

  it("converts into every currency and persists the choice", async () => {
    renderApp();
    await flush();

    act(() => screen.getByRole("button", { name: "Show values in USDC" }).click());
    expect(screen.getByTestId("money-converted")).toHaveTextContent("$250.00");
    expect(screen.getByTestId("money-original")).toHaveTextContent("1,000.00 XLM");
    expect(screen.getByTestId("money-estimate-label")).toHaveTextContent("(est.)");

    act(() => screen.getByRole("button", { name: "Show values in EURC" }).click());
    expect(screen.getByTestId("money-converted")).toHaveTextContent("€200.00");
    expect(localStorage.getItem(CURRENCY_STORAGE_KEY)).toBe("EUR");

    act(() => screen.getByRole("button", { name: "Show values in GBPC" }).click());
    expect(screen.getByTestId("money-converted")).toHaveTextContent("£180.00");
    expect(localStorage.getItem(CURRENCY_STORAGE_KEY)).toBe("GBP");

    act(() => screen.getByRole("button", { name: "Show values in KESC" }).click());
    expect(screen.getByTestId("money-converted")).toHaveTextContent(/32,500\.00/);
    expect(localStorage.getItem(CURRENCY_STORAGE_KEY)).toBe("KES");

    act(() => screen.getByRole("button", { name: "Show values in NGNC" }).click());
    expect(screen.getByTestId("money-converted")).toHaveTextContent(/400,000\.00/);

    act(() => screen.getByRole("button", { name: "Show values in XLM" }).click());
    expect(screen.queryByTestId("money-converted")).not.toBeInTheDocument();
  });

  it("restores the saved currency after remount", async () => {
    localStorage.setItem(CURRENCY_STORAGE_KEY, "EUR");
    renderApp();
    await flush();
    expect(screen.getByTestId("currency-option-eur")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("money-converted")).toHaveTextContent("€200.00");
  });

  it("warns when the oracle rate is older than an hour", async () => {
    localStorage.setItem(CURRENCY_STORAGE_KEY, "EUR");
    renderApp(Date.now() - 2 * 3_600_000);
    await flush();
    expect(screen.getByTestId("stale-rate-warning")).toBeInTheDocument();
    expect(screen.getByTestId("exchange-rate-disclaimer")).toHaveTextContent("out of date");
  });

  it("shows no warning for a fresh rate", async () => {
    localStorage.setItem(CURRENCY_STORAGE_KEY, "EUR");
    renderApp(Date.now() - 5 * 60_000);
    await flush();
    expect(screen.queryByTestId("stale-rate-warning")).not.toBeInTheDocument();
  });
});
