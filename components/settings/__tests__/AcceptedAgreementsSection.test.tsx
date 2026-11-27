import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AcceptedAgreementsSection } from "@/components/settings/AcceptedAgreementsSection";
import { STORAGE_KEY_AGREEMENTS, CURRENT_TERMS_VERSION } from "@/hooks/useAgreement";

describe("AcceptedAgreementsSection Component (Issue #760)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("displays empty state when no agreements have been accepted", () => {
    render(<AcceptedAgreementsSection />);

    expect(screen.getByTestId("accepted-agreements-section")).toBeInTheDocument();
    expect(screen.getByTestId("no-agreements-message")).toBeInTheDocument();
    expect(screen.getByText(/No investment agreements accepted yet/i)).toBeInTheDocument();
    expect(screen.getByTestId("review-current-terms-btn")).toBeInTheDocument();
  });

  it("displays list of accepted versions and download buttons", () => {
    const records = [
      {
        version: CURRENT_TERMS_VERSION,
        acceptedAt: "2026-11-15T10:30:00.000Z",
        termsTitle: "StellarState Master Agreement",
        confirmationId: "AGR-CURRENT-123",
      },
      {
        version: "2.0.0",
        acceptedAt: "2026-06-01T12:00:00.000Z",
        termsTitle: "StellarState Master Agreement",
        confirmationId: "AGR-OLD-456",
      },
    ];
    localStorage.setItem(STORAGE_KEY_AGREEMENTS, JSON.stringify(records));

    render(<AcceptedAgreementsSection />);

    expect(screen.queryByTestId("no-agreements-message")).not.toBeInTheDocument();
    expect(screen.getByTestId("agreements-list")).toBeInTheDocument();

    expect(screen.getByTestId(`agreement-row-${CURRENT_TERMS_VERSION}`)).toBeInTheDocument();
    expect(screen.getByTestId("agreement-row-2.0.0")).toBeInTheDocument();
    expect(screen.getByTestId(`download-agreement-${CURRENT_TERMS_VERSION}`)).toBeInTheDocument();
    expect(screen.getByText(/AGR-CURRENT-123/)).toBeInTheDocument();
    expect(screen.getByText(/AGR-OLD-456/)).toBeInTheDocument();
  });
});
