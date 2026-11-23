import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WithdrawCommitmentModal } from "../WithdrawCommitmentModal";

vi.mock("@/context/WalletContext", () => ({
  useWallet: () => ({ address: "GINVESTOR", isConnected: true }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const api = vi.hoisted(() => ({
  fetchExitPreview: vi.fn(),
  withdrawCommitment: vi.fn(),
}));
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    // Run raw payloads through the real normaliser so the tests cover it.
    fetchExitPreview: async (id: string, wallet: string) =>
      actual.normalizeExitPreview(await api.fetchExitPreview(id, wallet), id),
    withdrawCommitment: api.withdrawCommitment,
  };
});

function renderModal() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <WithdrawCommitmentModal invoiceId="inv-1" invoiceTitle="Alpha" />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByTestId("withdraw-commitment-open"));
}

describe("WithdrawCommitmentModal (#593)", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.useRealTimers());

  it("does not fetch the preview until the modal opens", () => {
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <WithdrawCommitmentModal invoiceId="inv-1" />
      </QueryClientProvider>,
    );
    expect(api.fetchExitPreview).not.toHaveBeenCalled();
  });

  it("shows the normal breakdown and confirms without a checkbox", async () => {
    api.fetchExitPreview.mockResolvedValue({
      commitment: 1000,
      fee_bps: 150,
      next_fee_bps: 100,
      next_change_at: new Date(Date.now() + 3 * 3600_000).toISOString(),
    });
    api.withdrawCommitment.mockResolvedValue({ tx_hash: "abc" });
    renderModal();
    expect(await screen.findByTestId("exit-commitment")).toHaveTextContent("1,000 XLM");
    expect(screen.getByTestId("exit-fee-percent")).toHaveTextContent("1.5%");
    expect(screen.getByTestId("exit-fee-amount")).toHaveTextContent("15 XLM");
    expect(screen.getByTestId("exit-net-refund")).toHaveTextContent("985 XLM");
    expect(screen.getByTestId("fee-trend-hint")).toHaveAttribute("data-trend", "falling");
    expect(screen.getByTestId("fee-trend-hint")).toHaveTextContent(/falls to 1%/);
    expect(screen.queryByTestId("exit-high-fee-checkbox")).not.toBeInTheDocument();
    expect(screen.queryByTestId("exit-fee-waived")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("withdraw-commitment-confirm"));
    await waitFor(() => expect(api.withdrawCommitment).toHaveBeenCalledWith("inv-1", "GINVESTOR"));
  });

  it("shows the waiver notice and a zero fee when minimum funding was missed", async () => {
    api.fetchExitPreview.mockResolvedValue({ commitment: 1000, fee_bps: 300, fee_waived: true });
    renderModal();
    expect(await screen.findByTestId("exit-fee-waived")).toHaveTextContent(/did not reach its minimum funding/);
    expect(screen.getByTestId("exit-fee-amount")).toHaveTextContent("0 XLM");
    expect(screen.getByTestId("exit-fee-percent")).toHaveTextContent("0%");
    expect(screen.getByTestId("exit-net-refund")).toHaveTextContent("1,000 XLM");
    expect(screen.queryByTestId("fee-trend-hint")).not.toBeInTheDocument();
    expect(screen.getByTestId("withdraw-commitment-confirm")).toBeEnabled();
  });

  it("requires the checkbox before confirming a fee above 2%", async () => {
    api.fetchExitPreview.mockResolvedValue({ commitment: 1000, fee_bps: 350, next_fee_bps: 400 });
    api.withdrawCommitment.mockResolvedValue({});
    renderModal();
    const confirm = await screen.findByTestId("withdraw-commitment-confirm");
    await screen.findByTestId("exit-high-fee-checkbox");
    expect(screen.getByTestId("fee-trend-hint")).toHaveAttribute("data-trend", "rising");
    expect(confirm).toBeDisabled();
    fireEvent.click(confirm);
    expect(api.withdrawCommitment).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("exit-high-fee-checkbox"));
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    await waitFor(() => expect(api.withdrawCommitment).toHaveBeenCalledTimes(1));
  });

  it("shows an error with a working retry when the preview fails", async () => {
    api.fetchExitPreview
      .mockRejectedValueOnce(new Error("Simulation failed"))
      .mockResolvedValue({ commitment: 500, fee_bps: 100 });
    renderModal();
    expect(await screen.findByTestId("exit-preview-error")).toHaveTextContent("Simulation failed");
    expect(screen.getByTestId("withdraw-commitment-confirm")).toBeDisabled();
    fireEvent.click(screen.getByTestId("exit-preview-retry"));
    expect(await screen.findByTestId("exit-net-refund")).toHaveTextContent("495 XLM");
  });

  it("refreshes the preview every 15 seconds while open", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    api.fetchExitPreview
      .mockResolvedValueOnce({ commitment: 1000, fee_bps: 150 })
      .mockResolvedValue({ commitment: 1000, fee_bps: 120 });
    renderModal();
    expect(await screen.findByTestId("exit-fee-percent")).toHaveTextContent("1.5%");
    expect(api.fetchExitPreview).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    await waitFor(() => expect(screen.getByTestId("exit-fee-percent")).toHaveTextContent("1.2%"));
    expect(api.fetchExitPreview).toHaveBeenCalledTimes(2);
  });
});
