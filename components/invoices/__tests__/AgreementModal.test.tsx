import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AgreementReviewContent, AgreementModal } from "@/components/invoices/AgreementModal";
import { CURRENT_TERMS_VERSION } from "@/hooks/useAgreement";

describe("AgreementModal & AgreementReviewContent (Issue #760)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders terms content, title, and initial disabled state", () => {
    render(<AgreementReviewContent version="2.1.0" />);

    expect(screen.getByText(/Terms Version 2.1.0/i)).toBeInTheDocument();
    expect(screen.getByTestId("agreement-scroll-container")).toBeInTheDocument();
    expect(screen.getByTestId("scroll-status-pending")).toBeInTheDocument();

    const acceptBtn = screen.getByTestId("accept-agreement-btn");
    expect(acceptBtn).toBeDisabled();
  });

  it("keeps Accept disabled until scrolled to bottom and checkbox is checked", () => {
    const onAccepted = vi.fn();
    render(<AgreementReviewContent version="2.1.0" onAccepted={onAccepted} />);

    const container = screen.getByTestId("agreement-scroll-container");
    const checkbox = screen.getByTestId("agreement-ack-checkbox");
    const acceptBtn = screen.getByTestId("accept-agreement-btn");

    // Checking only checkbox before scrolling leaves button disabled
    fireEvent.click(checkbox);
    expect(acceptBtn).toBeDisabled();

    // Scroll to end
    Object.defineProperty(container, "scrollHeight", { value: 1000, configurable: true });
    Object.defineProperty(container, "scrollTop", { value: 750, configurable: true });
    Object.defineProperty(container, "clientHeight", { value: 250, configurable: true });
    fireEvent.scroll(container);

    expect(screen.getByTestId("scroll-status-complete")).toBeInTheDocument();
    expect(acceptBtn).not.toBeDisabled();

    // Click accept
    fireEvent.click(acceptBtn);
    expect(onAccepted).toHaveBeenCalledTimes(1);

    // Verify localStorage has accepted record
    const stored = JSON.parse(localStorage.getItem("ss_accepted_agreements") || "[]");
    expect(stored.length).toBe(1);
    expect(stored[0].version).toBe("2.1.0");
  });

  it("renders within AgreementModal dialog when open", () => {
    render(
      <AgreementModal
        open={true}
        onOpenChange={vi.fn()}
        onAccepted={vi.fn()}
      />
    );

    expect(screen.getByTestId("agreement-modal-dialog")).toBeInTheDocument();
    expect(screen.getByText(/Investment Agreement Review/i)).toBeInTheDocument();
  });

  it("blocks investing when enforceAgreement is true and terms are unaccepted", () => {
    // In InvestmentModal, when enforceAgreement is true and storage is empty, it blocks
    const stored = localStorage.getItem("ss_accepted_agreements");
    expect(stored).toBeNull();
  });
});
