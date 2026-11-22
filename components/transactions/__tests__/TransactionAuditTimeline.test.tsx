import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { TransactionAuditTimeline } from "../TransactionAuditTimeline";
import {
  SAMPLE_COMPLETED_AUDIT,
  SAMPLE_PENDING_AUDIT,
  SAMPLE_FAILED_AUDIT,
} from "@/lib/analytics/transactionTimeline";

describe("TransactionAuditTimeline component (#670)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders completed timeline with all 5 stages and explorer link", () => {
    render(
      <TransactionAuditTimeline
        initialOptions={{
          initialRecord: SAMPLE_COMPLETED_AUDIT,
          initialSelectedStageIndex: 3, // confirmed stage has hash & explorer link
        }}
      />
    );

    expect(screen.getByTestId("transaction-audit-timeline")).toBeInTheDocument();
    expect(screen.getByTestId("status-badge-completed")).toHaveTextContent("Settled On-Chain");
    expect(screen.getByTestId("diagnostic-id-value")).toHaveTextContent(SAMPLE_COMPLETED_AUDIT.diagnosticId);

    // Explorer link
    const explorerLink = screen.getByTestId("stage-explorer-link");
    expect(explorerLink).toBeInTheDocument();
    expect(explorerLink).toHaveAttribute("href", expect.stringContaining("stellar.expert/explorer/public/tx/"));

    // Stage cards
    expect(screen.getByTestId("stage-step-initiated")).toBeInTheDocument();
    expect(screen.getByTestId("stage-step-signed")).toBeInTheDocument();
    expect(screen.getByTestId("stage-step-submitted")).toBeInTheDocument();
    expect(screen.getByTestId("stage-step-confirmed")).toBeInTheDocument();
    expect(screen.getByTestId("stage-step-settled")).toBeInTheDocument();

    // Dual timestamps present
    expect(screen.getByTestId("timestamp-server")).toBeInTheDocument();
    expect(screen.getByTestId("timestamp-chain")).toBeInTheDocument();
  });

  it("copies diagnostic ID to clipboard", () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <TransactionAuditTimeline
        initialOptions={{
          initialRecord: SAMPLE_COMPLETED_AUDIT,
        }}
      />
    );

    const copyBtn = screen.getByTestId("btn-copy-diagnostic-id");
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith(SAMPLE_COMPLETED_AUDIT.diagnosticId);
  });

  it("preserves selected stage index when live update occurs", () => {
    render(
      <TransactionAuditTimeline
        initialOptions={{
          initialRecord: SAMPLE_PENDING_AUDIT,
          initialSelectedStageIndex: 2, // submitted stage
        }}
      />
    );

    // Click simulate update button
    const updateBtn = screen.getByTestId("btn-simulate-update");
    fireEvent.click(updateBtn);

    // Selected stage index should still be stage 3 (submitted stage)
    expect(screen.getByTestId("stage-details-card")).toHaveTextContent("Stage 3: Awaiting Soroban Ingestion");
  });

  it("renders pending in-flight state with pending badge", () => {
    render(
      <TransactionAuditTimeline
        initialOptions={{
          initialRecord: SAMPLE_PENDING_AUDIT,
        }}
      />
    );

    expect(screen.getByTestId("status-badge-pending")).toHaveTextContent("In-Flight Processing");
  });

  it("renders terminal failure state with alert banner", () => {
    render(
      <TransactionAuditTimeline
        initialOptions={{
          initialRecord: SAMPLE_FAILED_AUDIT,
          initialSelectedStageIndex: 3, // confirmed failed stage
        }}
      />
    );

    expect(screen.getByTestId("status-badge-failed")).toHaveTextContent("Terminal Failure");
    expect(screen.getByTestId("terminal-failure-alert")).toBeInTheDocument();
    expect(screen.getAllByText(/InsufficientEscrowAllowance/)[0]).toBeInTheDocument();
  });

  it("switches scenarios when scenario buttons are clicked", () => {
    render(<TransactionAuditTimeline />);

    fireEvent.click(screen.getByTestId("btn-sim-failed"));
    expect(screen.getByTestId("status-badge-failed")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("btn-sim-pending"));
    expect(screen.getByTestId("status-badge-pending")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("btn-sim-completed"));
    expect(screen.getByTestId("status-badge-completed")).toBeInTheDocument();
  });

  it("sanitizes diagnostics to exclude secrets from display", () => {
    const recordWithSecrets = {
      ...SAMPLE_COMPLETED_AUDIT,
      meta: {
        ...SAMPLE_COMPLETED_AUDIT.meta,
        rawDiagnostics: {
          clientVersion: "1.10.4",
          seedPhrase: "secret seed phrase words",
          privateKey: "SXXXXPRIVKEY",
        },
      },
    };

    render(
      <TransactionAuditTimeline
        initialOptions={{
          initialRecord: recordWithSecrets,
        }}
      />
    );

    const pre = screen.getByTestId("sanitized-diagnostics-pre");
    expect(pre.textContent).toContain("clientVersion");
    expect(pre.textContent).not.toContain("seedPhrase");
    expect(pre.textContent).not.toContain("privateKey");
    expect(pre.textContent).not.toContain("SXXXXPRIVKEY");
  });
});
