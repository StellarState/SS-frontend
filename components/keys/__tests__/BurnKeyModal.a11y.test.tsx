import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BurnKeyModal } from "@/components/keys/BurnKeyModal";
import type { InvestmentPosition } from "@/lib/portfolio";

const mutateAsync = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ address: "GTESTADDRESS", jwt: null }),
}));

vi.mock("@/hooks/useStellarWallet", () => ({
  useStellarWallet: () => ({ address: "GTESTADDRESS" }),
}));

vi.mock("@/hooks/useCreatorKeys", () => ({
  useBurnCreatorKeyMutation: () => ({ mutateAsync, isPending: false }),
}));

const position: InvestmentPosition = {
  invoice_id: "inv-1",
  invoice_title: "Creator Key Position",
  committed_amount: 100,
  status: "active",
  key_id: "key-1",
  key_title: "Creator Key",
  quantity: 10,
};

/**
 * Focus containment is impossible to confirm by reading the markup, and the
 * app cannot be booted in this state (lib/api has a duplicate export that
 * fails every route), so these assertions drive the real keyboard.
 */
describe("BurnKeyModal keyboard containment", () => {
  it("is labelled by its heading rather than being an unnamed dialog", async () => {
    const user = userEvent.setup();
    render(<BurnKeyModal position={position} />);
    await user.click(screen.getByTestId("burn-button-key-1"));

    const dialog = screen.getByRole("dialog");
    const labelledBy = dialog.getAttribute("aria-labelledby");
    expect(labelledBy).toBeTruthy();
    expect(document.getElementById(labelledBy!)).toHaveTextContent(
      "Creator Key",
    );
  });

  it("moves focus into the dialog on open", async () => {
    const user = userEvent.setup();
    render(<BurnKeyModal position={position} />);
    await user.click(screen.getByTestId("burn-button-key-1"));

    expect(screen.getByTestId("burn-quantity-input")).toHaveFocus();
  });

  it("cycles Tab from the last control back to the first, staying in the dialog", async () => {
    const user = userEvent.setup();
    render(<BurnKeyModal position={position} />);
    await user.click(screen.getByTestId("burn-button-key-1"));

    const dialog = screen.getByRole("dialog");
    const first = screen.getByTestId("burn-quantity-input");

    // Walk forwards until we wrap; every stop must remain inside the dialog.
    for (let i = 0; i < 12; i += 1) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
      if (document.activeElement === first) break;
    }

    expect(document.activeElement).toBe(first);
  });

  it("cycles Shift+Tab from the first control to the last", async () => {
    const user = userEvent.setup();
    render(<BurnKeyModal position={position} />);
    await user.click(screen.getByTestId("burn-button-key-1"));

    const dialog = screen.getByRole("dialog");
    const first = screen.getByTestId("burn-quantity-input");
    expect(first).toHaveFocus();

    await user.tab({ shift: true });

    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    expect(document.activeElement).not.toBe(first);
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<BurnKeyModal position={position} />);
    await user.click(screen.getByTestId("burn-button-key-1"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("returns focus to the trigger that opened it", async () => {
    const user = userEvent.setup();
    render(<BurnKeyModal position={position} />);
    const trigger = screen.getByTestId("burn-button-key-1");

    await user.click(trigger);
    expect(screen.getByTestId("burn-quantity-input")).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(trigger).toHaveFocus();
  });
});
