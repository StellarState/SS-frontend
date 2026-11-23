import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Keypair } from "stellar-sdk";
import { OperatorsPage } from "../OperatorsPage";
import type { PayoutOperator } from "@/lib/api";

const INVESTOR = Keypair.random().publicKey();

const api = vi.hoisted(() => ({
  fetchOperators: vi.fn(),
  approveOperator: vi.fn(),
  revokeOperator: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  ...api,
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ address: INVESTOR, jwt: "jwt" }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const future = (days: number) => new Date(Date.now() + days * 86400000).toISOString();
const futureDate = (days: number) => future(days).slice(0, 10);

function op(expiresAt: string): PayoutOperator {
  return { address: Keypair.random().publicKey(), expires_at: expiresAt };
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <OperatorsPage />
    </QueryClientProvider>,
  );
}

describe("OperatorsPage (#591)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists operators with expiry and labels expired ones", async () => {
    const active = op(future(30));
    const expired = op(future(-1));
    api.fetchOperators.mockResolvedValue([active, expired]);
    renderPage();
    expect(await screen.findByTestId(`operator-status-${active.address}`)).toHaveTextContent("Active");
    expect(screen.getByTestId(`operator-status-${expired.address}`)).toHaveTextContent("Expired");
    expect(screen.getByTestId("operators-counter")).toHaveTextContent("1 / 5 active");
  });

  it("rejects an invalid address inline and shows the explanation in the modal", async () => {
    api.fetchOperators.mockResolvedValue([]);
    renderPage();
    fireEvent.click(await screen.findByTestId("approve-operator-open"));
    const modal = await screen.findByTestId("approve-operator-modal");
    expect(within(modal).getByTestId("operator-explanation")).toHaveTextContent(
      /claim payouts to your wallet only/,
    );
    fireEvent.change(within(modal).getByTestId("operator-address-input"), { target: { value: "GNOTVALID" } });
    fireEvent.change(within(modal).getByTestId("operator-expiry-input"), { target: { value: futureDate(10) } });
    fireEvent.click(within(modal).getByTestId("approve-operator-submit"));
    expect(await within(modal).findByTestId("operator-address-error")).toHaveTextContent("Invalid Stellar address");
    expect(api.approveOperator).not.toHaveBeenCalled();
  });

  it("approves a valid operator", async () => {
    api.fetchOperators.mockResolvedValue([]);
    const address = Keypair.random().publicKey();
    api.approveOperator.mockResolvedValue({ address, expires_at: future(10) });
    renderPage();
    fireEvent.click(await screen.findByTestId("approve-operator-open"));
    const modal = await screen.findByTestId("approve-operator-modal");
    fireEvent.change(within(modal).getByTestId("operator-address-input"), { target: { value: address } });
    fireEvent.change(within(modal).getByTestId("operator-expiry-input"), { target: { value: futureDate(10) } });
    fireEvent.click(within(modal).getByTestId("approve-operator-submit"));
    await waitFor(() =>
      expect(api.approveOperator).toHaveBeenCalledWith(INVESTOR, address, `${futureDate(10)}T23:59:59.000Z`, "jwt"),
    );
  });

  it("blocks approving a sixth active operator", async () => {
    api.fetchOperators.mockResolvedValue(Array.from({ length: 5 }, () => op(future(30))));
    renderPage();
    expect(await screen.findByTestId("operators-limit-reached")).toBeInTheDocument();
    expect(screen.getByTestId("operators-counter")).toHaveTextContent("5 / 5 active");
    expect(screen.getByTestId("approve-operator-open")).toBeDisabled();
  });

  it("does not count expired operators against the limit", async () => {
    api.fetchOperators.mockResolvedValue([
      ...Array.from({ length: 4 }, () => op(future(30))),
      op(future(-2)),
    ]);
    renderPage();
    await screen.findByTestId("operators-table");
    expect(screen.getByTestId("operators-counter")).toHaveTextContent("4 / 5 active");
    expect(screen.getByTestId("approve-operator-open")).toBeEnabled();
  });

  it("revokes after confirmation and removes the row immediately", async () => {
    const target = op(future(30));
    const other = op(future(30));
    api.fetchOperators.mockResolvedValue([target, other]);
    // Never resolves: proves the row is gone before the contract call returns.
    api.revokeOperator.mockReturnValue(new Promise(() => {}));
    renderPage();
    fireEvent.click(await screen.findByTestId(`operator-revoke-${target.address}`));
    const dialog = await screen.findByTestId("revoke-operator-dialog");
    expect(api.revokeOperator).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByTestId("revoke-operator-confirm"));
    await waitFor(() => expect(screen.queryByTestId(`operator-row-${target.address}`)).not.toBeInTheDocument());
    expect(screen.getByTestId(`operator-row-${other.address}`)).toBeInTheDocument();
    expect(api.revokeOperator).toHaveBeenCalledWith(INVESTOR, target.address, "jwt");
  });

  it("restores the row if revoking fails", async () => {
    const target = op(future(30));
    api.fetchOperators.mockResolvedValue([target]);
    api.revokeOperator.mockRejectedValue(new Error("boom"));
    renderPage();
    fireEvent.click(await screen.findByTestId(`operator-revoke-${target.address}`));
    fireEvent.click(within(await screen.findByTestId("revoke-operator-dialog")).getByTestId("revoke-operator-confirm"));
    expect(await screen.findByTestId(`operator-row-${target.address}`)).toBeInTheDocument();
  });
});
