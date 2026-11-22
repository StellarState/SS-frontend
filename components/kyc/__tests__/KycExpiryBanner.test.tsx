import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { KycExpiryBanner } from "../KycExpiryBanner";

describe("KycExpiryBanner Component (#672)", () => {
  it("renders user-specific banner and timezone-correct countdown", () => {
    render(<KycExpiryBanner />);

    expect(screen.getByTestId("kyc-expiry-banner")).toBeInTheDocument();
    // User-specific title
    expect(screen.getByTestId("user-banner-title")).toHaveTextContent(
      "Elena Rostova • Meridian Trade Finance Corp"
    );

    // Timezone badge
    const timezoneBadge = screen.getByTestId("timezone-countdown-badge");
    expect(timezoneBadge).toHaveTextContent("America/New_York");

    // Notifications active initially
    expect(screen.getByTestId("badge-notifications-active")).toBeInTheDocument();
  });

  it("displays explicit expiry reason when an action is restricted in grace window", () => {
    render(<KycExpiryBanner />);

    // Attempt restricted issuance
    const testIssuanceBtn = screen.getByTestId("btn-test-create-invoice");
    fireEvent.click(testIssuanceBtn);

    // Reason alert appears
    const blockedAlert = screen.getByTestId("blocked-action-alert");
    expect(blockedAlert).toBeInTheDocument();
    expect(blockedAlert).toHaveTextContent("Action blocked during final");
    expect(blockedAlert).toHaveTextContent("grace window");
  });

  it("opens re-verification flow, shows preserved fields, and silences notifications on renewal", () => {
    render(<KycExpiryBanner />);

    const openModalBtn = screen.getByTestId("btn-open-reverification");
    fireEvent.click(openModalBtn);

    // Re-verification modal appears
    expect(screen.getByTestId("reverification-modal")).toBeInTheDocument();

    // Verify historical fields preserved and locked
    expect(screen.getByTestId("preserved-entity-name")).toHaveTextContent(
      "Meridian Trade Finance Corp"
    );
    expect(screen.getByTestId("preserved-tax-id")).toHaveTextContent("XX-XXX4912");

    // Fill new document file
    const fileInput = screen.getByTestId("input-renewal-file");
    fireEvent.change(fileInput, { target: { value: "Updated_Certificate_2027.pdf" } });

    // Submit renewal
    const submitBtn = screen.getByTestId("btn-submit-renewal");
    fireEvent.click(submitBtn);

    // Modal closes and state transitions to renewed
    expect(screen.queryByTestId("reverification-modal")).not.toBeInTheDocument();
    expect(screen.getByTestId("badge-notifications-silenced")).toBeInTheDocument();
    expect(screen.getByText(/Re-verification submitted/i)).toBeInTheDocument();
  });

  it("transitions between 30d, 7d grace, expired and renewed states", () => {
    render(<KycExpiryBanner />);

    // Simulate 30d
    fireEvent.click(screen.getByTestId("btn-sim-30d"));
    expect(screen.getByTestId("timezone-countdown-badge")).toHaveTextContent("25d");

    // Simulate expired
    fireEvent.click(screen.getByTestId("btn-sim-expired"));
    expect(screen.getByTestId("timezone-countdown-badge")).toHaveTextContent("Expired");

    // Simulate renewed
    fireEvent.click(screen.getByTestId("btn-sim-renewed"));
    expect(screen.getByTestId("badge-notifications-silenced")).toBeInTheDocument();
  });
});
