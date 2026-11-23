import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CovenantCurePanel } from "../CovenantCurePanel";
import type {
  CovenantBreach,
  CureProposal,
  CovenantTimelineEvent,
} from "@/lib/analytics/covenantCure";

const mockCreateProposal = vi.fn();
const mockCastVote = vi.fn();

vi.mock("@/hooks/useCovenantCure", () => ({
  useCovenantBreach: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
  })),
  useCureProposals: vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
  })),
  useCovenantTimeline: vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
  })),
  useCreateCureProposalMutation: vi.fn(() => ({
    mutate: mockCreateProposal,
    isPending: false,
  })),
  useCastVoteMutation: vi.fn(() => ({
    mutate: mockCastVote,
    isPending: false,
  })),
}));

describe("CovenantCurePanel (#684)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleBreach: CovenantBreach = {
    id: "breach-10",
    invoice_id: "inv-500",
    issuer_address: "GBISSUER_OFFICIAL",
    covenant_name: "Minimum DSCR Ratio",
    threshold_metric: "DSCR >= 1.25",
    threshold_value: 1.25,
    actual_value: 1.12,
    breach_detected_at: "2026-11-15T08:00:00Z",
    status: "in_breach",
    cure_deadline: "2026-12-05T00:00:00Z",
  };

  const sampleProposal: CureProposal = {
    id: "prop-10",
    breach_id: "breach-10",
    invoice_id: "inv-500",
    issuer_address: "GBISSUER_OFFICIAL",
    cure_type: "extension",
    title: "30-Day Extension Plan with Yield Bump",
    description: "Temporary operational liquidity shortfall due to cross-border settlement delay.",
    proposed_terms: {
      extension_days: 30,
      new_yield_rate: 14.5,
    },
    evidence_urls: ["https://docs.issuer.com/audit.pdf"],
    voting_deadline: "2026-11-28T12:00:00Z",
    quorum_percent_required: 50.0,
    approval_threshold_percent: 66.67,
    total_eligible_principal: 100000,
    voted_principal_for: 35000,
    voted_principal_against: 15000,
    voters: {},
    status: "active",
    created_at: "2026-11-18T10:00:00Z",
  };

  const sampleTimeline: CovenantTimelineEvent[] = [
    {
      id: "ev-1",
      breach_id: "breach-10",
      timestamp: "2026-11-15T08:00:00Z",
      event_type: "breach_detected",
      title: "Covenant Breach Detected",
      details: "Actual DSCR 1.12 fell below required 1.25.",
    },
  ];

  it("renders breach overview banner and status details", () => {
    render(
      <CovenantCurePanel
        invoiceId="inv-500"
        walletAddress="GBINVESTOR1"
        breachOverride={sampleBreach}
        proposalsOverride={[]}
        timelineOverride={sampleTimeline}
      />
    );

    expect(screen.getByTestId("breach-alert-banner")).toBeInTheDocument();
    expect(screen.getByTestId("covenant-title")).toHaveTextContent("Minimum DSCR Ratio");
    expect(screen.getByTestId("covenant-status-badge")).toHaveTextContent("IN BREACH");
    expect(screen.getByText("DSCR >= 1.25")).toBeInTheDocument();
    expect(screen.getByText("1.12")).toBeInTheDocument();
  });

  it("authorizes designated issuer to open and submit cure proposal", async () => {
    render(
      <CovenantCurePanel
        invoiceId="inv-500"
        walletAddress="GBISSUER_OFFICIAL" // Logged in as authorized issuer
        breachOverride={sampleBreach}
        proposalsOverride={[]}
        timelineOverride={sampleTimeline}
      />
    );

    const openBtn = screen.getByTestId("open-cure-proposal-btn");
    expect(openBtn).toBeInTheDocument();
    fireEvent.click(openBtn);

    // Form appears
    expect(screen.getByTestId("cure-proposal-form")).toBeInTheDocument();
    const submitBtn = screen.getByTestId("submit-proposal-btn");
    expect(submitBtn).toBeDisabled();

    // Fill form
    fireEvent.change(screen.getByTestId("proposal-title-input"), {
      target: { value: "30-Day Extension Plan" },
    });
    fireEvent.change(screen.getByTestId("proposal-description-input"), {
      target: {
        value: "Detailed remediation steps to restore DSCR to 1.30 within 30 days.",
      },
    });

    expect(submitBtn).toBeEnabled();
    fireEvent.click(submitBtn);

    expect(mockCreateProposal).toHaveBeenCalledWith(
      expect.objectContaining({
        breach_id: "breach-10",
        cure_type: "extension",
        title: "30-Day Extension Plan",
      }),
      expect.anything()
    );
  });

  it("hides proposal initiation button from unauthorized non-issuers", () => {
    render(
      <CovenantCurePanel
        invoiceId="inv-500"
        walletAddress="GBRANDOM_INVESTOR" // Non-issuer
        breachOverride={sampleBreach}
        proposalsOverride={[]}
        timelineOverride={sampleTimeline}
      />
    );

    expect(screen.queryByTestId("open-cure-proposal-btn")).not.toBeInTheDocument();
  });

  it("displays quorum progress, approval threshold, and allows investor to vote", () => {
    render(
      <CovenantCurePanel
        invoiceId="inv-500"
        walletAddress="GBINVESTOR_COMMITTED"
        eligiblePrincipal={20000}
        breachOverride={sampleBreach}
        proposalsOverride={[sampleProposal]}
        timelineOverride={sampleTimeline}
      />
    );

    // Quorum: 35k + 15k = 50k / 100k = 50%
    expect(screen.getByTestId("quorum-value-prop-10")).toHaveTextContent("50%");
    expect(screen.getByTestId("quorum-status-prop-10")).toHaveTextContent("Quorum Reached");

    // Approval: 35k / 50k = 70%
    expect(screen.getByTestId("approval-value-prop-10")).toHaveTextContent("70% For");

    // Voting buttons for investor
    const voteForBtn = screen.getByTestId("vote-for-btn-prop-10");
    const voteAgainstBtn = screen.getByTestId("vote-against-btn-prop-10");
    expect(voteForBtn).toBeInTheDocument();
    expect(voteAgainstBtn).toBeInTheDocument();

    fireEvent.click(voteForBtn);
    expect(mockCastVote).toHaveBeenCalledWith(
      expect.objectContaining({
        proposalId: "prop-10",
        vote: "for",
        eligiblePrincipal: 20000,
      })
    );
  });

  it("finalised and expired proposals reject more votes and display terminal lock reason", () => {
    const expiredProposal: CureProposal = {
      ...sampleProposal,
      id: "prop-expired",
      status: "expired",
      terminal_reason: "Expired: Quorum failed (25% vs 50% required).",
      voting_deadline: "2026-11-10T00:00:00Z",
    };

    render(
      <CovenantCurePanel
        invoiceId="inv-500"
        walletAddress="GBINVESTOR_COMMITTED"
        breachOverride={sampleBreach}
        proposalsOverride={[expiredProposal]}
        timelineOverride={sampleTimeline}
      />
    );

    expect(screen.queryByTestId("vote-for-btn-prop-expired")).not.toBeInTheDocument();
    expect(screen.queryByTestId("vote-against-btn-prop-expired")).not.toBeInTheDocument();
    expect(screen.getByTestId("terminal-reason-prop-expired")).toHaveTextContent(
      "Expired: Quorum failed (25% vs 50% required)."
    );
  });

  it("renders chronological covenant audit timeline events", () => {
    render(
      <CovenantCurePanel
        invoiceId="inv-500"
        walletAddress="GBINVESTOR1"
        breachOverride={sampleBreach}
        proposalsOverride={[sampleProposal]}
        timelineOverride={sampleTimeline}
      />
    );

    expect(screen.getByTestId("timeline-event-ev-1")).toHaveTextContent(
      "Covenant Breach Detected"
    );
    expect(screen.getByTestId("timeline-event-ev-1")).toHaveTextContent(
      "Actual DSCR 1.12 fell below required 1.25."
    );
  });
});
