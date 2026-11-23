import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EscapeWithdrawPage } from "../EscapeWithdrawPage";
import type { EscapePosition, EscapeStatus } from "@/lib/api";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn() }) }));
vi.mock("@/context/WalletContext", () => ({
  useWallet: () => ({ address: "GINVESTOR", isConnected: true }),
}));

const api = vi.hoisted(() => ({
  fetchEscapeStatus: vi.fn(),
  fetchEscapePositions: vi.fn(),
  submitEscapeWithdraw: vi.fn(),
}));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  ...api,
}));

const OPEN: EscapeStatus = {
  paused: true,
  paused_at: "2026-01-01T00:00:00Z",
  escape_available_at: "2026-01-08T00:00:00Z",
  escape_enabled: true,
};

const positions: EscapePosition[] = [
  { invoice_id: "inv-a", invoice_title: "Alpha", committed: 1000, recoverable: 812.5, withdrawn: false },
  { invoice_id: "inv-b", invoice_title: "Beta", committed: 500, recoverable: 400, withdrawn: true },
];

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <EscapeWithdrawPage />
    </QueryClientProvider>,
  );
}

describe("EscapeWithdrawPage (#592)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redirects when escape mode is inactive", async () => {
    api.fetchEscapeStatus.mockResolvedValue({ ...OPEN, escape_enabled: false });
    renderPage();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(screen.queryByTestId("escape-page")).not.toBeInTheDocument();
    expect(api.fetchEscapePositions).not.toHaveBeenCalled();
  });

  it("lists positions with the contract preview amounts and the yield note", async () => {
    api.fetchEscapeStatus.mockResolvedValue(OPEN);
    api.fetchEscapePositions.mockResolvedValue(positions);
    renderPage();
    expect(await screen.findByTestId("escape-recoverable-inv-a")).toHaveTextContent("812.5 XLM");
    expect(screen.getByTestId("escape-recoverable-inv-b")).toHaveTextContent("400 XLM");
    expect(screen.getByTestId("escape-yield-note")).toHaveTextContent(/yield and bonuses are not included/);
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows already-withdrawn positions without a Withdraw action", async () => {
    api.fetchEscapeStatus.mockResolvedValue(OPEN);
    api.fetchEscapePositions.mockResolvedValue(positions);
    renderPage();
    expect(await screen.findByTestId("escape-withdrawn-inv-b")).toHaveTextContent("Withdrawn");
    expect(screen.queryByTestId("escape-withdraw-inv-b")).not.toBeInTheDocument();
  });

  it("marks a position withdrawn after success so it cannot be withdrawn again", async () => {
    api.fetchEscapeStatus.mockResolvedValue(OPEN);
    api.fetchEscapePositions.mockResolvedValueOnce(positions).mockReturnValue(new Promise(() => {}));
    api.submitEscapeWithdraw.mockResolvedValue({ tx_hash: "abc" });
    renderPage();
    fireEvent.click(await screen.findByTestId("escape-withdraw-inv-a"));
    expect(await screen.findByTestId("escape-withdrawn-inv-a")).toBeInTheDocument();
    expect(screen.queryByTestId("escape-withdraw-inv-a")).not.toBeInTheDocument();
    expect(api.submitEscapeWithdraw).toHaveBeenCalledTimes(1);
    expect(api.submitEscapeWithdraw).toHaveBeenCalledWith("inv-a", "GINVESTOR");
  });

  it("shows a readable message for contract errors", async () => {
    api.fetchEscapeStatus.mockResolvedValue(OPEN);
    api.fetchEscapePositions.mockResolvedValue(positions);
    api.submitEscapeWithdraw.mockRejectedValue(new Error("HostError: Error(Contract, #2)"));
    renderPage();
    fireEvent.click(await screen.findByTestId("escape-withdraw-inv-a"));
    expect(await screen.findByTestId("escape-error-inv-a")).toHaveTextContent(
      "This position has already been withdrawn.",
    );
    expect(screen.getByTestId("escape-withdraw-inv-a")).toBeEnabled();
  });
});
