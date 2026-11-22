import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChangeEmailModal } from "@/components/email/ChangeEmailModal";

describe("ChangeEmailModal (#653)", () => {
  it("requires a valid email and re-authentication before sending", async () => {
    const user = userEvent.setup();
    const onChangeEmail = vi.fn().mockResolvedValue(undefined);
    render(
      <ChangeEmailModal open onOpenChange={vi.fn()} currentEmail="old@example.com" onChangeEmail={onChangeEmail} />,
    );

    const submit = screen.getByTestId("change-email-submit") as HTMLButtonElement;
    expect(submit.disabled).toBe(true);

    await user.type(screen.getByTestId("new-email-input"), "new@example.com");
    expect(submit.disabled).toBe(true);

    await user.type(screen.getByTestId("change-email-password"), "correct-password");
    expect(submit.disabled).toBe(false);

    await user.click(submit);
    await waitFor(() =>
      expect(onChangeEmail).toHaveBeenCalledWith("new@example.com", "correct-password"),
    );
  });

  it("keeps the old address active after requesting a change", async () => {
    const user = userEvent.setup();
    render(
      <ChangeEmailModal
        open
        onOpenChange={vi.fn()}
        currentEmail="old@example.com"
        onChangeEmail={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    await user.type(screen.getByTestId("new-email-input"), "new@example.com");
    await user.type(screen.getByTestId("change-email-password"), "secret");
    await user.click(screen.getByTestId("change-email-submit"));

    expect(await screen.findByTestId("change-email-sent")).toHaveTextContent(
      "current address remains active",
    );
    expect(screen.getByText(/current address, old@example.com/)).toBeInTheDocument();
  });

  it("surfaces re-authentication failures", async () => {
    const user = userEvent.setup();
    render(
      <ChangeEmailModal
        open
        onOpenChange={vi.fn()}
        currentEmail="old@example.com"
        onChangeEmail={vi.fn().mockRejectedValue(new Error("Incorrect password"))}
      />,
    );

    await user.type(screen.getByTestId("new-email-input"), "new@example.com");
    await user.type(screen.getByTestId("change-email-password"), "wrong");
    await user.click(screen.getByTestId("change-email-submit"));

    expect(await screen.findByTestId("change-email-error")).toHaveTextContent("Incorrect password");
  });
});
