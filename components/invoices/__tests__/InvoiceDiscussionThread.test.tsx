import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InvoiceDiscussionThread } from "@/components/invoices/InvoiceDiscussionThread";
import type { DiscussionThread } from "@/lib/discussion";

describe("InvoiceDiscussionThread Component (#661)", () => {
  const issuer = "GISSUER_ABCDEF123456789";
  const investor = "GINVESTOR_XYZ987654321";

  const sampleThreads: DiscussionThread[] = [
    {
      id: "th-1",
      invoiceId: "inv-test",
      title: "Warehouse storage inspection",
      authorAddress: investor,
      isResolved: false,
      createdAt: "2026-07-01T10:00:00Z",
      comments: [
        {
          id: "cm-1",
          threadId: "th-1",
          invoiceId: "inv-test",
          authorAddress: investor,
          isIssuer: false,
          content: "Was the warehouse storage temperature verified?",
          createdAt: "2026-07-01T10:00:00Z",
          isReported: false,
          moderationStatus: "approved",
        },
      ],
    },
    {
      id: "th-2",
      invoiceId: "inv-test",
      title: "Invoice settlement currency",
      authorAddress: investor,
      isResolved: true,
      resolvedAt: "2026-07-02T10:00:00Z",
      resolvedBy: issuer,
      createdAt: "2026-07-01T12:00:00Z",
      comments: [
        {
          id: "cm-2",
          threadId: "th-2",
          invoiceId: "inv-test",
          authorAddress: investor,
          isIssuer: false,
          content: "Does settlement happen in XLM or USDC?",
          createdAt: "2026-07-01T12:00:00Z",
          isReported: false,
          moderationStatus: "approved",
        },
        {
          id: "cm-3",
          threadId: "th-2",
          invoiceId: "inv-test",
          authorAddress: issuer,
          isIssuer: true,
          content: "All settlements execute in XLM on-chain.",
          createdAt: "2026-07-01T12:30:00Z",
          isReported: false,
          moderationStatus: "approved",
        },
      ],
    },
  ];

  it("renders thread list, issuer verified badge, and resolved status", () => {
    render(
      <InvoiceDiscussionThread
        invoiceId="inv-test"
        issuerAddress={issuer}
        currentUserAddress={investor}
        initialThreads={sampleThreads}
      />,
    );

    expect(screen.getByTestId("invoice-discussion-threads")).toBeInTheDocument();
    expect(screen.getByText("Warehouse storage inspection")).toBeInTheDocument();
    expect(screen.getByText("Invoice settlement currency")).toBeInTheDocument();
    expect(screen.getByTestId("resolved-badge")).toHaveTextContent("Resolved");
    expect(screen.getByTestId("issuer-verified-badge")).toHaveTextContent("Verified Issuer");
  });

  it("filters threads by tabs and searches across all threads", () => {
    render(
      <InvoiceDiscussionThread
        invoiceId="inv-test"
        issuerAddress={issuer}
        currentUserAddress={investor}
        initialThreads={sampleThreads}
      />,
    );

    // Filter "Unanswered"
    fireEvent.click(screen.getByTestId("filter-unanswered"));
    expect(screen.getByText("Warehouse storage inspection")).toBeInTheDocument();
    expect(screen.queryByText("Invoice settlement currency")).not.toBeInTheDocument();

    // Filter "Issuer Replies"
    fireEvent.click(screen.getByTestId("filter-issuer-reply"));
    expect(screen.queryByText("Warehouse storage inspection")).not.toBeInTheDocument();
    expect(screen.getByText("Invoice settlement currency")).toBeInTheDocument();

    // Filter "Resolved"
    fireEvent.click(screen.getByTestId("filter-resolved"));
    expect(screen.getByText("Invoice settlement currency")).toBeInTheDocument();

    // Search query finds matching thread even when resolved
    fireEvent.click(screen.getByTestId("filter-all"));
    fireEvent.change(screen.getByTestId("discussion-search-input"), {
      target: { value: "temperature" },
    });
    expect(screen.getByText("Warehouse storage inspection")).toBeInTheDocument();
    expect(screen.queryByText("Invoice settlement currency")).not.toBeInTheDocument();
  });

  it("allows asking questions with character countdown", async () => {
    render(
      <InvoiceDiscussionThread
        invoiceId="inv-test"
        issuerAddress={issuer}
        currentUserAddress={investor}
        initialThreads={sampleThreads}
      />,
    );

    fireEvent.click(screen.getByTestId("new-thread-btn"));
    expect(screen.getByTestId("new-thread-form")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("thread-title-input"), {
      target: { value: "Port Customs Fee" },
    });
    fireEvent.change(screen.getByTestId("thread-content-input"), {
      target: { value: "Who covers port clearance charges?" },
    });

    expect(screen.getByTestId("char-countdown")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("submit-thread-btn"));

    await waitFor(() => {
      expect(screen.getByText("Port Customs Fee")).toBeInTheDocument();
      expect(screen.getByText("Who covers port clearance charges?")).toBeInTheDocument();
    });
  });

  it("allows issuer to mark thread as resolved", () => {
    render(
      <InvoiceDiscussionThread
        invoiceId="inv-test"
        issuerAddress={issuer}
        currentUserAddress={issuer} // Current user is issuer
        initialThreads={sampleThreads}
      />,
    );

    // Thread 1 is currently open
    fireEvent.click(screen.getByTestId("toggle-resolve-th-1"));

    // Now Thread 1 should show resolved badge
    expect(screen.getAllByTestId("resolved-badge")).toHaveLength(2);
  });

  it("supports reporting comments for moderation review", async () => {
    render(
      <InvoiceDiscussionThread
        invoiceId="inv-test"
        issuerAddress={issuer}
        currentUserAddress="G_ANOTHER_INVESTOR"
        initialThreads={sampleThreads}
      />,
    );

    fireEvent.click(screen.getByTestId("report-btn-cm-1"));
    fireEvent.change(screen.getByTestId("report-reason-input-cm-1"), {
      target: { value: "Off-topic solicitation" },
    });
    fireEvent.click(screen.getByTestId("confirm-report-cm-1"));

    await waitFor(() => {
      expect(
        screen.getByText(/This comment has been reported and is currently under moderator review/),
      ).toBeInTheDocument();
    });
  });
});
