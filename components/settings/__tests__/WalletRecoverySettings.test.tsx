import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WalletRecoverySettings } from "../WalletRecoverySettings";

describe("WalletRecoverySettings Component (#673)", () => {
  it("renders recovery readiness score meter and tier badge", () => {
    render(<WalletRecoverySettings />);

    expect(screen.getByTestId("wallet-recovery-settings")).toBeInTheDocument();
    expect(screen.getByTestId("score-value")).toHaveTextContent("55%");
    expect(screen.getByTestId("tier-badge-moderate")).toBeInTheDocument();

    // Verify zero-secret policy notice is present
    expect(screen.getByTestId("zero-secret-guarantee")).toHaveTextContent(
      "never requests or displays your 12/24-word recovery phrase or private keys"
    );
  });

  it("updates checklist and recalculates readiness score immediately upon toggle", () => {
    render(<WalletRecoverySettings />);

    // Activate hardware key (+25%) -> 55 + 25 = 80% (Robust)
    const toggleHardwareKey = screen.getByTestId("btn-toggle-hardware_key");
    fireEvent.click(toggleHardwareKey);

    expect(screen.getByTestId("score-value")).toHaveTextContent("80%");
    expect(screen.getByTestId("tier-badge-robust")).toBeInTheDocument();

    // Activate emergency contact (+20%) -> 80 + 20 = 100%
    const toggleEmergencyContact = screen.getByTestId("btn-toggle-emergency_contact");
    fireEvent.click(toggleEmergencyContact);

    expect(screen.getByTestId("score-value")).toHaveTextContent("100%");

    // Disable secondary signer (-35%) -> 100 - 35 = 65% (Moderate)
    const toggleSecondarySigner = screen.getByTestId("btn-toggle-secondary_signer");
    fireEvent.click(toggleSecondarySigner);

    expect(screen.getByTestId("score-value")).toHaveTextContent("65%");
    expect(screen.getByTestId("tier-badge-moderate")).toBeInTheDocument();
  });

  it("initiates recovery address cooldown, displays timelock, and enforces cooldown completion", () => {
    render(<WalletRecoverySettings />);

    const addressInput = screen.getByTestId("input-new-recovery-address");
    const startCooldownBtn = screen.getByTestId("btn-start-cooldown");

    const newTarget = "GCNEWRECOVERYGUARDIAN99881122334455667788STLT";
    fireEvent.change(addressInput, { target: { value: newTarget } });
    fireEvent.click(startCooldownBtn);

    // Active cooldown box appears
    expect(screen.getByTestId("active-cooldown-box")).toBeInTheDocument();
    expect(screen.getByTestId("pending-target-address")).toHaveTextContent(newTarget);

    // Finalize button is disabled during active timelock
    const finalizeBtn = screen.getByTestId("btn-finalize-cooldown");
    expect(finalizeBtn).toBeDisabled();

    // Fast forward cooldown (simulate expiration)
    const fastForwardBtn = screen.getByTestId("btn-simulate-cooldown-expire");
    fireEvent.click(fastForwardBtn);

    // Finalize button is now enabled
    expect(finalizeBtn).not.toBeDisabled();

    // Finalize update
    fireEvent.click(finalizeBtn);

    // Current recovery address updated
    expect(screen.getByTestId("current-recovery-address")).toHaveTextContent(newTarget);
    expect(screen.queryByTestId("active-cooldown-box")).not.toBeInTheDocument();
  });

  it("allows canceling active recovery address cooldown request", () => {
    render(<WalletRecoverySettings />);

    const addressInput = screen.getByTestId("input-new-recovery-address");
    const startCooldownBtn = screen.getByTestId("btn-start-cooldown");

    fireEvent.change(addressInput, {
      target: { value: "GCNEWRECOVERYGUARDIAN99881122334455667788STLT" },
    });
    fireEvent.click(startCooldownBtn);

    expect(screen.getByTestId("active-cooldown-box")).toBeInTheDocument();

    const cancelBtn = screen.getByTestId("btn-cancel-cooldown");
    fireEvent.click(cancelBtn);

    expect(screen.queryByTestId("active-cooldown-box")).not.toBeInTheDocument();
    expect(screen.getByTestId("recovery-success-alert")).toHaveTextContent("canceled");
  });
});
