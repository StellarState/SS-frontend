import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OnboardingChecklist, OnboardingUserData } from "../OnboardingChecklist";

describe("OnboardingChecklist", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  const baseData: OnboardingUserData = {
    kycStatus: null,
    displayName: null,
    avatarUrl: null,
    invoiceCount: 0,
  };

  it("Step 1 is incomplete when kycStatus is null and complete when kycStatus is pending or approved", () => {
    const { rerender } = render(<OnboardingChecklist data={{ ...baseData, kycStatus: null }} />);
    expect(screen.getByTestId("step-1-incomplete")).toBeInTheDocument();
    expect(screen.queryByTestId("step-1-complete")).not.toBeInTheDocument();

    rerender(<OnboardingChecklist data={{ ...baseData, kycStatus: "pending" }} />);
    expect(screen.getByTestId("step-1-complete")).toBeInTheDocument();
    expect(screen.queryByTestId("step-1-incomplete")).not.toBeInTheDocument();

    rerender(<OnboardingChecklist data={{ ...baseData, kycStatus: "approved" }} />);
    expect(screen.getByTestId("step-1-complete")).toBeInTheDocument();
    expect(screen.queryByTestId("step-1-incomplete")).not.toBeInTheDocument();
  });

  it("Step 2 is incomplete until displayName and avatarUrl are set", () => {
    const { rerender } = render(<OnboardingChecklist data={{ ...baseData, displayName: null }} />);
    expect(screen.getByTestId("step-2-incomplete")).toBeInTheDocument();
    expect(screen.queryByTestId("step-2-complete")).not.toBeInTheDocument();

    rerender(<OnboardingChecklist data={{ ...baseData, displayName: "Alice" }} />);
    expect(screen.getByTestId("step-2-incomplete")).toBeInTheDocument();

    rerender(
      <OnboardingChecklist
        data={{ ...baseData, displayName: "Alice", avatarUrl: "/avatar.png" }}
      />
    );
    expect(screen.getByTestId("step-2-complete")).toBeInTheDocument();
    expect(screen.queryByTestId("step-2-incomplete")).not.toBeInTheDocument();
  });

  it("Step 3 is incomplete when invoiceCount is 0 and complete when invoiceCount is at least 1", () => {
    const { rerender } = render(<OnboardingChecklist data={{ ...baseData, invoiceCount: 0 }} />);
    expect(screen.getByTestId("step-3-incomplete")).toBeInTheDocument();
    expect(screen.queryByTestId("step-3-complete")).not.toBeInTheDocument();

    rerender(<OnboardingChecklist data={{ ...baseData, invoiceCount: 1 }} />);
    expect(screen.getByTestId("step-3-complete")).toBeInTheDocument();
    expect(screen.queryByTestId("step-3-incomplete")).not.toBeInTheDocument();

    rerender(<OnboardingChecklist data={{ ...baseData, invoiceCount: 5 }} />);
    expect(screen.getByTestId("step-3-complete")).toBeInTheDocument();
    expect(screen.queryByTestId("step-3-incomplete")).not.toBeInTheDocument();
  });

  it("checklist is hidden when all three steps are complete", () => {
    const completeData: OnboardingUserData = {
      kycStatus: "approved",
      displayName: "Alice",
      avatarUrl: "/avatar.png",
      invoiceCount: 1,
    };
    render(<OnboardingChecklist data={completeData} />);
    expect(screen.queryByTestId("onboarding-checklist")).not.toBeInTheDocument();
  });

  it("dismissal writes to localStorage and hides the checklist", () => {
    render(<OnboardingChecklist data={baseData} />);
    expect(screen.getByTestId("onboarding-checklist")).toBeInTheDocument();

    const dismissBtn = screen.getByTestId("dismiss-checklist-btn");
    fireEvent.click(dismissBtn);

    expect(screen.queryByTestId("onboarding-checklist")).not.toBeInTheDocument();
    expect(localStorage.getItem("onboarding_checklist_dismissed")).toBe("true");
  });
});
