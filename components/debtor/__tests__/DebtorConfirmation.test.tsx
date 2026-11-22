import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DebtorConfirmation } from "../DebtorConfirmation";

const TOKEN = "tok_abc123";

const SUMMARY = {
  invoiceNumber: "INV-1042",
  issuerName: "Acme Logistics Ltd",
  amount: "1250",
  currency: "USDC",
  dueDate: "2026-12-31T00:00:00.000Z",
  documentUrl: "https://example.com/invoice.pdf",
};

interface FakeResponse {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}

function respond(status: number, body: unknown = {}): FakeResponse {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <DebtorConfirmation token={TOKEN} />
    </QueryClientProvider>
  );
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DebtorConfirmation — token states", () => {
  it("shows the invoice summary for a valid token", async () => {
    fetchMock.mockResolvedValueOnce(respond(200, SUMMARY));
    renderPage();

    const card = await screen.findByTestId("debtor-summary");
    expect(card).toHaveTextContent("INV-1042");
    expect(card).toHaveTextContent("Acme Logistics Ltd");
    expect(card).toHaveTextContent("1,250.00 USDC");
    expect(card).toHaveTextContent("December 31, 2026");
    expect(screen.getByRole("link", { name: /view invoice document/i })).toHaveAttribute(
      "href",
      SUMMARY.documentUrl
    );
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toContain(`/debtor-confirmations/${TOKEN}`);
  });

  it("shows a loading state while the summary is fetched", () => {
    fetchMock.mockReturnValueOnce(new Promise(() => {}));
    renderPage();
    expect(screen.getByTestId("debtor-loading")).toBeInTheDocument();
  });

  it("omits the document link when the invoice has none", async () => {
    fetchMock.mockResolvedValueOnce(respond(200, { ...SUMMARY, documentUrl: null }));
    renderPage();
    await screen.findByTestId("debtor-summary");
    expect(screen.queryByRole("link", { name: /view invoice document/i })).not.toBeInTheDocument();
  });

  it("shows a clear message for an expired token", async () => {
    fetchMock.mockResolvedValueOnce(respond(410));
    renderPage();
    const alert = await screen.findByTestId("debtor-token-expired");
    expect(alert).toHaveTextContent("Link expired");
    expect(alert).toHaveTextContent(/has expired/i);
    expect(screen.queryByRole("button", { name: "Confirm" })).not.toBeInTheDocument();
  });

  it("shows a clear message for an already-used token", async () => {
    fetchMock.mockResolvedValueOnce(respond(409));
    renderPage();
    const alert = await screen.findByTestId("debtor-token-used");
    expect(alert).toHaveTextContent("Link already used");
    expect(alert).toHaveTextContent(/already been used/i);
  });

  it("shows a clear message for an invalid token", async () => {
    fetchMock.mockResolvedValueOnce(respond(404));
    renderPage();
    const alert = await screen.findByTestId("debtor-token-invalid");
    expect(alert).toHaveTextContent("Invalid link");
    expect(alert).toHaveTextContent(/not valid/i);
  });

  it("prefers an explicit error code over the HTTP status", async () => {
    fetchMock.mockResolvedValueOnce(respond(400, { error: { code: "token_expired" } }));
    renderPage();
    expect(await screen.findByTestId("debtor-token-expired")).toBeInTheDocument();
  });

  it("does not retry a token that cannot become valid", async () => {
    fetchMock.mockResolvedValue(respond(404));
    renderPage();
    await screen.findByTestId("debtor-token-invalid");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("DebtorConfirmation — actions", () => {
  it("confirms the invoice and shows a final success screen", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(respond(200, SUMMARY)).mockResolvedValueOnce(respond(200));
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Confirm" }));

    const success = await screen.findByTestId("debtor-success");
    expect(success).toHaveTextContent("Invoice confirmed");
    expect(screen.getByTestId("payment-instructions-link")).toHaveAttribute(
      "href",
      `/pay/${TOKEN}`
    );
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toContain(`/debtor-confirmations/${TOKEN}`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ decision: "confirm" });
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("requires a reason before a rejection is submitted", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(respond(200, SUMMARY));
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Reject" }));
    await user.click(screen.getByRole("button", { name: "Submit rejection" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/enter a reason/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await user.type(screen.getByLabelText("Reason for rejection"), "no");
    await user.click(screen.getByRole("button", { name: "Submit rejection" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/at least 5 characters/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects the invoice with the reason and shows a final success screen", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(respond(200, SUMMARY)).mockResolvedValueOnce(respond(200));
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Reject" }));
    await user.type(screen.getByLabelText("Reason for rejection"), "  Goods never delivered  ");
    await user.click(screen.getByRole("button", { name: "Submit rejection" }));

    const success = await screen.findByTestId("debtor-success");
    expect(success).toHaveTextContent("Invoice rejected");
    const [, init] = fetchMock.mock.calls[1];
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ decision: "reject", reason: "Goods never delivered" });
  });

  it("can go back from the rejection form without submitting", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(respond(200, SUMMARY));
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Reject" }));
    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows the token state when the link was used before the decision was submitted", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(respond(200, SUMMARY)).mockResolvedValueOnce(respond(409));
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Confirm" }));

    const alert = await screen.findByTestId("debtor-submit-error");
    expect(alert).toHaveTextContent("Link already used");
    await waitFor(() => expect(screen.queryByTestId("debtor-success")).not.toBeInTheDocument());
  });
});
