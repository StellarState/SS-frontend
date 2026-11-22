import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { VerifyEmailPage } from "@/components/email/VerifyEmailPage";
import { EmailVerificationError } from "@/lib/emailVerification";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
}));

describe("VerifyEmailPage (#653)", () => {
  it("shows success for a valid token", async () => {
    render(<VerifyEmailPage token="good" onConfirm={vi.fn().mockResolvedValue(undefined)} />);
    expect(await screen.findByTestId("verify-success")).toBeInTheDocument();
  });

  it("shows a distinct expired message", async () => {
    const expired = new EmailVerificationError("expired", "expired");
    render(<VerifyEmailPage token="old" onConfirm={vi.fn().mockRejectedValue(expired)} />);
    expect(await screen.findByTestId("verify-expired")).toBeInTheDocument();
    expect(screen.queryByTestId("verify-invalid")).not.toBeInTheDocument();
  });

  it("shows an invalid message for a bad token", async () => {
    const invalid = new EmailVerificationError("invalid", "invalid");
    render(<VerifyEmailPage token="bad" onConfirm={vi.fn().mockRejectedValue(invalid)} />);
    expect(await screen.findByTestId("verify-invalid")).toBeInTheDocument();
  });

  it("shows a missing-token message when no token is present", async () => {
    render(<VerifyEmailPage token={null} onConfirm={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByTestId("verify-missing")).toBeInTheDocument(),
    );
  });
});
