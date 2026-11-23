import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DisputeEvidenceTimeline } from "../DisputeEvidenceTimeline";
import { createMockDispute } from "@/lib/disputeEvidence";

describe("DisputeEvidenceTimeline", () => {
  it("renders SLA age, required action with deadline, and public status", () => {
    render(<DisputeEvidenceTimeline invoiceId="INV-9001" />);

    expect(screen.getByTestId("dispute-evidence-timeline")).toBeInTheDocument();
    expect(screen.getByTestId("public-status-badge")).toBeInTheDocument();
    expect(screen.getByTestId("sla-age-card")).toBeInTheDocument();
    expect(screen.getByTestId("sla-age-text")).toHaveTextContent(/Days Elapsed/);
    expect(screen.getByTestId("required-action-card")).toBeInTheDocument();
    expect(screen.getByTestId("action-deadline")).toBeInTheDocument();
  });

  it("submits text evidence and renders it in the immutable timeline", () => {
    render(<DisputeEvidenceTimeline invoiceId="INV-9001" />);

    const titleInput = screen.getByTestId("input-evidence-title");
    const textArea = screen.getByTestId("textarea-statement-text");
    const submitBtn = screen.getByTestId("submit-evidence-btn");

    fireEvent.change(titleInput, { target: { value: "Notice of Non-Conformance" } });
    fireEvent.change(textArea, {
      target: { value: "Goods were rejected at port due to broken seal." },
    });
    fireEvent.click(submitBtn);

    expect(screen.getByText("Notice of Non-Conformance")).toBeInTheDocument();
    expect(
      screen.getByText("Goods were rejected at port due to broken seal.")
    ).toBeInTheDocument();
  });

  it("locks evidence when adjudication begins and prevents new submissions", () => {
    const lockedDispute = createMockDispute(
      "INV-9001",
      "Machinery Invoice",
      "GBZXN7PIRZGNMHGA72ODXR6DTZS657SDNVWYTG52M7NA65I4Q2IT5678",
      "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7",
      "adjudication"
    );

    render(
      <DisputeEvidenceTimeline
        invoiceId="INV-9001"
        initialDispute={lockedDispute}
      />
    );

    expect(screen.getByTestId("adjudication-locked-notice")).toBeInTheDocument();
    expect(screen.getByText(/Evidence Submission Locked \(adjudication\)/)).toBeInTheDocument();
    expect(screen.queryByTestId("evidence-submission-form-card")).not.toBeInTheDocument();
  });

  it("filters confidential evidence from public observers", () => {
    render(
      <DisputeEvidenceTimeline
        invoiceId="INV-9001"
        currentUserRole="public"
        currentUserAddress="GD7B7Z43F24TRJ4O5GDT35G3SDGV3N2V3Y4G24DGY254G34G354GT435"
      />
    );

    // Initial mock dispute has 1 confidential file: "Bill of Lading & Signed Delivery Receipt"
    // As public observer, that confidential event should NOT be rendered
    expect(
      screen.queryByText("Bill of Lading & Signed Delivery Receipt")
    ).not.toBeInTheDocument();
  });
});
