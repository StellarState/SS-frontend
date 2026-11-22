import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PayoutDestinationsPanel } from "../PayoutDestinationsPanel";
import { DESTINATIONS_STORAGE_KEY } from "@/lib/destinations";

const VALID = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

async function addDestination(user: ReturnType<typeof userEvent.setup>, options: {
  label: string;
  address: string;
  memo?: string;
  requiresMemo?: boolean;
}) {
  await user.click(screen.getByTestId("add-destination-trigger"));
  await user.type(screen.getByTestId("destination-label"), options.label);
  await user.type(screen.getByTestId("destination-address"), options.address);
  if (options.requiresMemo) {
    await user.click(screen.getByTestId("requires-memo"));
    if (options.memo) await user.type(screen.getByTestId("destination-memo"), options.memo);
  }
  await user.click(screen.getByTestId("save-destination"));
}

describe("PayoutDestinationsPanel", () => {
  beforeEach(() => localStorage.clear());

  it("rejects invalid addresses with an inline error", async () => {
    const user = userEvent.setup();
    render(<PayoutDestinationsPanel />);
    await addDestination(user, { label: "Bank", address: "not-an-address" });

    expect(await screen.findByTestId("address-error")).toHaveTextContent(/invalid/i);
    expect(screen.getByTestId("no-saved-destinations")).toBeInTheDocument();
  });

  it("requires a confirmation code before a new destination is usable", async () => {
    const user = userEvent.setup();
    render(<PayoutDestinationsPanel />);
    await addDestination(user, { label: "Bank", address: VALID });

    const pickerButton = screen.getByTestId(/^picker-select-/);
    expect(pickerButton).toBeDisabled();
    expect(screen.getByText("Needs confirmation")).toBeInTheDocument();

    await user.click(screen.getByTestId(/^start-confirm-/));
    await user.type(screen.getByTestId("confirmation-code"), "12345");
    await user.click(screen.getByTestId("submit-confirmation"));
    expect(await screen.findByText(/6-digit code/)).toBeInTheDocument();

    await user.clear(screen.getByTestId("confirmation-code"));
    await user.type(screen.getByTestId("confirmation-code"), "123456");
    await user.click(screen.getByTestId("submit-confirmation"));

    await waitFor(() => expect(screen.getByText("Confirmed")).toBeInTheDocument());
    expect(pickerButton).toBeEnabled();
  });

  it("warns when a destination requires a memo and none is provided", async () => {
    localStorage.setItem(
      DESTINATIONS_STORAGE_KEY,
      JSON.stringify([
        {
          id: "d1",
          label: "Exchange",
          address: VALID,
          requiresMemo: true,
          confirmed: true,
          createdAt: new Date().toISOString(),
        },
      ]),
    );
    render(<PayoutDestinationsPanel />);

    expect(await screen.findAllByText(/Memo required, none provided/)).not.toHaveLength(0);
    expect(screen.getByTestId(/^memo-warning-/)).toBeInTheDocument();
  });

  it("removes a deleted destination from the picker", async () => {
    const user = userEvent.setup();
    render(<PayoutDestinationsPanel />);
    await addDestination(user, { label: "Bank", address: VALID });
    await waitFor(() => expect(screen.getByTestId(/^picker-select-/)).toBeInTheDocument());

    await user.click(screen.getByTestId(/^delete-/));

    await waitFor(() => expect(screen.queryByTestId(/^picker-select-/)).not.toBeInTheDocument());
    expect(JSON.parse(localStorage.getItem(DESTINATIONS_STORAGE_KEY)!)).toEqual([]);
  });
});
