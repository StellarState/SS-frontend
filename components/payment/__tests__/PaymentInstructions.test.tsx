import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PaymentInstructions } from "../PaymentInstructions";

const { mockUsePaymentInstructions } = vi.hoisted(() => ({
  mockUsePaymentInstructions: vi.fn(),
}));

vi.mock("@/hooks/usePaymentInstructions", () => ({
  usePaymentInstructions: mockUsePaymentInstructions,
}));

vi.mock("react-qr-code", () => ({
  default: ({ value }: { value: string }) => <div data-testid="qr-value">{value}</div>,
}));

vi.mock("@/components/payment/PaymentCountdown", () => ({
  PaymentCountdown: () => <span data-testid="payment-countdown">01:00:00:00</span>,
}));

const VALID = {
  amountDue: 100,
  lateInterest: 0,
  destination: "GDESTINATION",
  memo: "INV-1042",
  dueAt: "2026-11-25T00:00:00Z",
  stages: { received: true, matched: false, settled: false },
};

beforeEach(() => {
  mockUsePaymentInstructions.mockReturnValue({
    data: { ok: true, instructions: VALID },
    isLoading: false,
  });
});

describe("PaymentInstructions page (#608)", () => {
  it("shows the amount, destination, memo and a memo-bearing QR URI", () => {
    render(<PaymentInstructions token="tok_abc" />);

    expect(screen.getByTestId("payment-amount")).toHaveTextContent("100.0000000 XLM");
    expect(screen.getByTestId("payment-destination")).toHaveTextContent("GDESTINATION");
    expect(screen.getByTestId("payment-memo")).toHaveTextContent("INV-1042");

    const uri = screen.getByTestId("qr-value").textContent ?? "";
    expect(uri).toContain("web+stellar:pay?destination=GDESTINATION");
    expect(uri).toContain("memo=INV-1042");
    expect(uri).toContain("amount=100.0000000");
    expect(screen.getByTestId("payment-memo-warning")).toHaveTextContent(
      "cannot be matched"
    );
  });

  it("copies the exact destination and memo values", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<PaymentInstructions token="tok_abc" />);
    await user.click(screen.getByTestId("copy-destination"));
    await user.click(screen.getByTestId("copy-memo"));

    expect(writeText).toHaveBeenCalledWith("GDESTINATION");
    expect(writeText).toHaveBeenCalledWith("INV-1042");
  });

  it("includes overdue interest in the amount to send", () => {
    mockUsePaymentInstructions.mockReturnValue({
      data: {
        ok: true,
        instructions: { ...VALID, lateInterest: 2.5 },
      },
      isLoading: false,
    });

    render(<PaymentInstructions token="tok_abc" />);
    expect(screen.getByTestId("payment-amount")).toHaveTextContent("102.5000000 XLM");
    expect(screen.getByTestId("payment-overdue-interest")).toHaveTextContent(
      "2.5000000 XLM of overdue interest"
    );
  });

  it("shows a clear message for an expired token", () => {
    mockUsePaymentInstructions.mockReturnValue({
      data: { ok: false, failure: "expired" },
      isLoading: false,
    });

    render(<PaymentInstructions token="tok_expired" />);
    expect(screen.getByTestId("payment-error")).toHaveTextContent("expired");
    expect(screen.queryByTestId("payment-qr")).not.toBeInTheDocument();
  });

  it("renders a loading state while instructions are fetched", () => {
    mockUsePaymentInstructions.mockReturnValue({ data: undefined, isLoading: true });
    render(<PaymentInstructions token="tok_abc" />);
    expect(screen.getByTestId("payment-loading")).toBeInTheDocument();
  });
});
