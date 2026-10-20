import { cloneElement } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DiversificationSettings } from "../DiversificationSettings";
import type { InvestmentPosition } from "@/lib/portfolio";

const mockLimit = vi.fn();
const mockWallet = vi.fn();
const mockPortfolio = vi.fn();
const mockSave = vi.fn();

vi.mock("@/hooks/useDiversification", () => ({
  useDiversificationLimit: () => mockLimit(),
  useSetDiversificationLimitMutation: () => mockSave(),
}));

vi.mock("@/hooks/usePortfolio", () => ({
  usePortfolio: () => mockPortfolio(),
}));

vi.mock("@/context/WalletContext", () => ({
  useWallet: () => mockWallet(),
}));

vi.mock("recharts", async (orig) => {
  const actual = await orig<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactElement }) =>
      cloneElement(children, { width: 200, height: 200 } as object),
  };
});

function position(overrides: Partial<InvestmentPosition>): InvestmentPosition {
  return {
    invoice_id: "inv-1",
    invoice_title: "Trade receivable 1",
    committed_amount: 1000,
    status: "active",
    ...overrides,
  };
}

function limit(overrides: { limit_pct?: number | null } = {}) {
  mockLimit.mockReturnValue({
    data: { limit_pct: null, ...overrides },
    isLoading: false,
    isError: false,
  });
}

describe("DiversificationSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWallet.mockReturnValue({ address: "GINV", isConnected: true });
    mockPortfolio.mockReturnValue({ data: { positions: [] } });
    mockSave.mockReturnValue({ mutate: vi.fn(), isPending: false });
    limit();
  });

  it("prompts to connect a wallet when disconnected", () => {
    mockWallet.mockReturnValue({ address: null, isConnected: false });
    limit();
    render(<DiversificationSettings />);
    expect(screen.getByTestId("diversification-connect")).toBeInTheDocument();
  });

  it("shows the default limit of 30% when none is configured", () => {
    limit({ limit_pct: null });
    render(<DiversificationSettings />);
    expect(screen.getByTestId("diversification-limit-input")).toHaveValue(30);
    expect(screen.getByTestId("diversification-current-limit")).toHaveTextContent("30%");
  });

  it("shows the configured limit when one is set", () => {
    limit({ limit_pct: 45 });
    render(<DiversificationSettings />);
    expect(screen.getByTestId("diversification-limit-input")).toHaveValue(45);
    expect(screen.getByTestId("diversification-current-limit")).toHaveTextContent("45%");
  });

  it("rejects a limit outside the 10-100% range with an inline error", async () => {
    const user = userEvent.setup();
    render(<DiversificationSettings />);
    const input = screen.getByTestId("diversification-limit-input");
    await user.clear(input);
    await user.type(input, "5");
    await user.click(screen.getByTestId("diversification-limit-save"));

    expect(await screen.findByTestId("diversification-limit-error")).toHaveTextContent(
      "between 10% and 100%",
    );
    expect(screen.getByTestId("diversification-limit-input")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(mockSave().mutate).not.toHaveBeenCalled();
  });

  it("submits the set_diversification_limit call with the configured limit", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();
    mockSave.mockReturnValue({ mutate, isPending: false });
    render(<DiversificationSettings />);
    const input = screen.getByTestId("diversification-limit-input");
    await user.clear(input);
    await user.type(input, "45");
    await user.click(screen.getByTestId("diversification-limit-save"));

    expect(mutate).toHaveBeenCalledWith({ wallet: "GINV", limitPct: 45 });
  });

  it("renders the concentration donut and per-invoice breakdown", async () => {
    mockPortfolio.mockReturnValue({
      data: {
        positions: [
          position({ invoice_id: "a", invoice_title: "A", committed_amount: 7500 }),
          position({ invoice_id: "b", invoice_title: "B", committed_amount: 2500 }),
        ],
      },
    });
    render(<DiversificationSettings />);
    await waitFor(() =>
      expect(screen.getByTestId("diversification-donut")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("diversification-share-a")).toHaveTextContent("75.0%");
    expect(screen.getByTestId("diversification-share-b")).toHaveTextContent("25.0%");
  });

  it("flags an invoice that breaches the limit", async () => {
    mockPortfolio.mockReturnValue({
      data: {
        positions: [
          position({ invoice_id: "a", invoice_title: "A", committed_amount: 7500 }),
          position({ invoice_id: "b", invoice_title: "B", committed_amount: 2500 }),
        ],
      },
    });
    render(<DiversificationSettings />);
    await waitFor(() =>
      expect(screen.getByTestId("diversification-breach-a")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("diversification-breach-summary")).toBeInTheDocument();
    expect(screen.queryByTestId("diversification-breach-b")).toBeNull();
  });

  it("flags an invoice that is close to the limit", async () => {
    mockPortfolio.mockReturnValue({
      data: {
        positions: [
          position({ invoice_id: "a", invoice_title: "A", committed_amount: 2600 }),
          position({ invoice_id: "b", invoice_title: "B", committed_amount: 7400 }),
        ],
      },
    });
    render(<DiversificationSettings />);
    await waitFor(() =>
      expect(screen.getByTestId("diversification-near-a")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("diversification-breach-a")).toBeNull();
  });

  it("shows an empty state when there are no active holdings", async () => {
    render(<DiversificationSettings />);
    expect(await screen.findByTestId("diversification-empty")).toBeInTheDocument();
  });
});
