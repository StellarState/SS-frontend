import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { WithdrawalAllowlistSettings } from "@/components/security/WithdrawalAllowlistSettings";

const VALID_ADDR = "GBZXN7PIRZGNMHGA72XZTOFGDPTGWTQ5QOFKWCZXUJ2GBXMHOCP4PJTV";

describe("WithdrawalAllowlistSettings Component (Issue #668)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders header and initial state", () => {
    render(<WithdrawalAllowlistSettings />);
    expect(screen.getByTestId("withdrawal-allowlist-settings")).toBeDefined();
    expect(screen.getByText("Withdrawal Address Allowlist")).toBeDefined();
  });

  it("requires authentication passcode to toggle enforcement", () => {
    render(<WithdrawalAllowlistSettings />);
    const toggle = screen.getByTestId("enforce-toggle");

    // Click without entering passcode
    fireEvent.click(toggle);
    expect(screen.getByTestId("allowlist-error")).toBeDefined();
    expect(
      screen.getByText(/Fresh authentication required to toggle allowlist enforcement/i),
    ).toBeDefined();
  });

  it("allows registering an address with valid authentication", () => {
    render(<WithdrawalAllowlistSettings />);

    // First authenticate session
    const passInput = screen.getByLabelText(/Passcode for verification/i);
    fireEvent.change(passInput, { target: { value: "1234" } });
    fireEvent.click(screen.getByText("Verify Session"));

    // Add address
    const addrInput = screen.getByLabelText(/Stellar Address/i);
    const labelInput = screen.getByLabelText(/Label \/ Description/i);

    fireEvent.change(addrInput, { target: { value: VALID_ADDR } });
    fireEvent.change(labelInput, { target: { value: "Cold Storage" } });

    fireEvent.click(screen.getByTestId("submit-allowlist-btn"));

    expect(screen.getByTestId("allowlist-success")).toBeDefined();
    expect(screen.getByText("Cold Storage")).toBeDefined();
    expect(screen.getByText("Cooldown Pending")).toBeDefined();
  });

  it("allows cancelling a pending cooldown address", () => {
    render(<WithdrawalAllowlistSettings />);

    // Authenticate and add address
    const passInput = screen.getByLabelText(/Passcode for verification/i);
    fireEvent.change(passInput, { target: { value: "1234" } });
    fireEvent.click(screen.getByText("Verify Session"));

    const addrInput = screen.getByLabelText(/Stellar Address/i);
    const labelInput = screen.getByLabelText(/Label \/ Description/i);
    fireEvent.change(addrInput, { target: { value: VALID_ADDR } });
    fireEvent.change(labelInput, { target: { value: "Temporary" } });
    fireEvent.click(screen.getByTestId("submit-allowlist-btn"));

    // Cancel pending
    const cancelBtn = screen.getByText("Cancel");
    fireEvent.click(cancelBtn);

    expect(screen.queryByText("Temporary")).toBeNull();
  });
});
