import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ComplianceReviewQueue } from "../ComplianceReviewQueue";

describe("ComplianceReviewQueue Component (#671 - P0)", () => {
  it("renders access denied view when user is not authorized", () => {
    render(<ComplianceReviewQueue isAuthorised={false} />);

    expect(screen.getByTestId("compliance-access-denied")).toBeInTheDocument();
    expect(screen.getByText("Access Denied")).toBeInTheDocument();
    expect(screen.queryByTestId("compliance-review-queue")).not.toBeInTheDocument();
  });

  it("renders triage queue with live counts and timezone-independent SLA badges", () => {
    render(<ComplianceReviewQueue isAuthorised={true} />);

    expect(screen.getByTestId("compliance-review-queue")).toBeInTheDocument();
    expect(screen.getByTestId("count-pending")).toHaveTextContent("3");
    expect(screen.getByTestId("count-critical")).toHaveTextContent("1");
    expect(screen.getByTestId("count-resolved")).toHaveTextContent("0");

    // Case 001 SLA is escalated (under 4h)
    const badge001 = screen.getByTestId("sla-badge-case-comp-001");
    expect(badge001).toHaveTextContent("Escalated");

    // Case 002 SLA is breached
    const badge002 = screen.getByTestId("sla-badge-case-comp-002");
    expect(badge002).toHaveTextContent("SLA Breached");
  });

  it("opens case drawer with evidence records and immutable history on click", () => {
    render(<ComplianceReviewQueue isAuthorised={true} />);

    // Click on Case 001
    const reviewBtn = screen.getByTestId("btn-review-case-comp-001");
    fireEvent.click(reviewBtn);

    // Case drawer is open
    expect(screen.getByTestId("compliance-case-drawer")).toBeInTheDocument();
    expect(screen.getByText("Delaware Certificate of Good Standing")).toBeInTheDocument();
    expect(screen.getByTestId("immutable-history-timeline")).toBeInTheDocument();
    expect(
      screen.getByText("Automated PEP and sanctions scan flagged secondary entity shareholder.")
    ).toBeInTheDocument();
  });

  it("enforces required comments and updates live queue counts immediately upon decision resolution", () => {
    render(<ComplianceReviewQueue isAuthorised={true} />);

    // Select Case 001
    fireEvent.click(screen.getByTestId("btn-review-case-comp-001"));

    // Decision buttons disabled initially because comment is empty
    const approveBtn = screen.getByTestId("btn-decision-approve");
    expect(approveBtn).toBeDisabled();

    // Type comment
    const commentInput = screen.getByTestId("input-decision-comment");
    fireEvent.change(commentInput, {
      target: { value: "Full KYC documentation verified and approved." },
    });

    // Approve button enabled
    expect(approveBtn).not.toBeDisabled();

    // Execute decision
    fireEvent.click(approveBtn);

    // Live counts update immediately (acceptance criterion)
    expect(screen.getByTestId("count-pending")).toHaveTextContent("2"); // Decreased from 3 to 2
    expect(screen.getByTestId("count-resolved")).toHaveTextContent("1"); // Increased from 0 to 1

    // Immutable history updated with new entry
    expect(
      screen.getByText("Full KYC documentation verified and approved.")
    ).toBeInTheDocument();
  });
});
