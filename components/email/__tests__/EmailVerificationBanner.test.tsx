import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmailVerificationBanner } from "@/components/email/EmailVerificationBanner";

describe("EmailVerificationBanner (#653)", () => {
  it("is hidden once the email is verified", () => {
    render(<EmailVerificationBanner email="a@example.com" verified />);
    expect(screen.queryByTestId("email-verification-banner")).not.toBeInTheDocument();
  });

  it("offers resend while unverified", () => {
    const onResend = vi.fn();
    render(
      <EmailVerificationBanner email="a@example.com" verified={false} onResend={onResend} />,
    );
    expect(screen.getByTestId("email-verification-banner")).toBeInTheDocument();
    screen.getByTestId("resend-verification").click();
    expect(onResend).toHaveBeenCalledTimes(1);
  });

  it("disables resend and shows the countdown during the cooldown", () => {
    render(
      <EmailVerificationBanner
        email="a@example.com"
        verified={false}
        cooldownSeconds={42}
        onResend={vi.fn()}
      />,
    );
    const button = screen.getByTestId("resend-verification") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button).toHaveTextContent("42s");
  });
});
