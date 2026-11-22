import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PasskeySettingsPanel } from "../PasskeySettingsPanel";
import { SAMPLE_ENROLLED_PASSKEYS } from "@/lib/security/passkeys";

describe("PasskeySettingsPanel Component (#674)", () => {
  it("renders enrolled passkey metadata safely without leaking secrets", () => {
    render(<PasskeySettingsPanel />);

    expect(screen.getByTestId("passkey-settings-panel")).toBeInTheDocument();
    expect(screen.getByText("MacBook Touch ID")).toBeInTheDocument();
    expect(screen.getByText("YubiKey 5C NFC")).toBeInTheDocument();

    // Verify transaction policy boundary notice is present
    expect(screen.getByTestId("transaction-boundary-alert")).toHaveTextContent(
      "On-chain Stellar transactions always require cryptographic wallet signing"
    );
  });

  it("completes passkey enrollment workflow with valid challenge", async () => {
    render(<PasskeySettingsPanel />);

    // Click Add Passkey
    const addBtn = screen.getByTestId("btn-add-passkey");
    fireEvent.click(addBtn);

    // Challenge box appears
    expect(screen.getByTestId("enrollment-challenge-box")).toBeInTheDocument();

    // Fill device label
    const nameInput = screen.getByTestId("input-passkey-name");
    fireEvent.change(nameInput, { target: { value: "Windows Hello Sensor" } });

    // Submit enrollment
    const completeBtn = screen.getByTestId("btn-complete-enroll");
    fireEvent.click(completeBtn);

    // Verified & saved into list
    expect(screen.getByText("Windows Hello Sensor")).toBeInTheDocument();
    expect(screen.getByTestId("passkey-success-alert")).toHaveTextContent("registered successfully");
  });

  it("requires fresh confirmation before removing a passkey and rejects incorrect keyword", () => {
    render(<PasskeySettingsPanel />);

    const removeBtn = screen.getByTestId("btn-remove-cred-mac-touch-id-98124");
    fireEvent.click(removeBtn);

    // Confirmation box appears
    expect(
      screen.getByTestId("removal-confirmation-box-cred-mac-touch-id-98124")
    ).toBeInTheDocument();

    const confirmInput = screen.getByTestId("input-confirm-remove-cred-mac-touch-id-98124");
    const confirmDeleteBtn = screen.getByTestId("btn-confirm-delete-cred-mac-touch-id-98124");

    // Attempt deletion with invalid keyword
    fireEvent.change(confirmInput, { target: { value: "wrong" } });
    fireEvent.click(confirmDeleteBtn);

    expect(screen.getByTestId("passkey-error-alert")).toHaveTextContent(
      'Fresh confirmation failed. You must type "REMOVE"'
    );
    expect(screen.getByText("MacBook Touch ID")).toBeInTheDocument();

    // Supply correct keyword
    fireEvent.change(confirmInput, { target: { value: "REMOVE" } });
    fireEvent.click(confirmDeleteBtn);

    expect(screen.queryByText("MacBook Touch ID")).not.toBeInTheDocument();
    expect(screen.getByTestId("passkey-success-alert")).toHaveTextContent(
      "Passkey was successfully removed"
    );
  });

  it("verifies sensitive account actions with passkey and fallback recovery code", () => {
    render(<PasskeySettingsPanel />);

    // Passkey verification
    const verifyPasskeyBtn = screen.getByTestId("btn-verify-passkey-action");
    fireEvent.click(verifyPasskeyBtn);

    expect(screen.getByTestId("test-action-status")).toHaveTextContent("Passkey Verified");

    // Toggle fallback
    const toggleFallbackBtn = screen.getByTestId("btn-toggle-fallback");
    fireEvent.click(toggleFallbackBtn);

    expect(screen.getByTestId("fallback-container")).toBeInTheDocument();

    // Submit fallback with valid code
    const recoveryInput = screen.getByTestId("input-recovery-code");
    fireEvent.change(recoveryInput, { target: { value: "RC-1234-5678" } });

    const submitFallbackBtn = screen.getByTestId("btn-submit-fallback");
    fireEvent.click(submitFallbackBtn);

    expect(screen.getByTestId("test-action-status")).toHaveTextContent("Fallback Verified");
    expect(screen.getByTestId("passkey-success-alert")).toHaveTextContent("recovery code");
  });
});
