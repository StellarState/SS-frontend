import { describe, it, expect } from "vitest";
import {
  validateCureProposal,
  calculateVotingProgress,
  castPrincipalWeightedVote,
  evaluateProposalOutcome,
  type CovenantBreach,
  type CureProposal,
} from "../covenantCure";

describe("covenantCure analytics (#684)", () => {
  const mockBreach: CovenantBreach = {
    id: "breach-1",
    invoice_id: "inv-300",
    issuer_address: "GBISSUER123",
    covenant_name: "Minimum DSCR Threshold",
    threshold_metric: "DSCR Ratio",
    threshold_value: 1.25,
    actual_value: 1.12,
    breach_detected_at: "2026-11-10T10:00:00Z",
    status: "in_breach",
    cure_deadline: "2026-11-30T10:00:00Z",
  };

  const sampleProposal: CureProposal = {
    id: "prop-1",
    breach_id: "breach-1",
    invoice_id: "inv-300",
    issuer_address: "GBISSUER123",
    cure_type: "extension",
    title: "Request 30-day Maturity Extension",
    description: "Supply chain receipt delayed debtor collection; requesting extension with compensatory yield.",
    proposed_terms: {
      extension_days: 30,
      new_yield_rate: 13.5,
    },
    evidence_urls: ["https://docs.stellarsettle.app/audit/breach-1-cure.pdf"],
    voting_deadline: "2026-11-25T10:00:00Z",
    quorum_percent_required: 50.0,
    approval_threshold_percent: 66.67,
    total_eligible_principal: 100000,
    voted_principal_for: 0,
    voted_principal_against: 0,
    voters: {},
    status: "active",
    created_at: "2026-11-18T10:00:00Z",
  };

  describe("Proposal creation & authorization (Only authorised issuers initiate proposals)", () => {
    it("validates compliant proposal from the authorized issuer", () => {
      const res = validateCureProposal(
        {
          breach_id: "breach-1",
          cure_type: "extension",
          title: "30-Day Extension Plan",
          description: "Cure plan outlining delayed receivable settlement and additional collateral buffer.",
          proposed_terms: { extension_days: 30 },
          voting_duration_days: 7,
        },
        mockBreach,
        "GBISSUER123",
      );

      expect(res.isValid).toBe(true);
      expect(Object.keys(res.errors).length).toBe(0);
    });

    it("rejects unauthorized issuer or third-party submissions", () => {
      const res = validateCureProposal(
        {
          breach_id: "breach-1",
          cure_type: "waiver",
          title: "Unauthorized Waiver",
          description: "Attempting to file waiver without being designated issuer for this invoice breach.",
          proposed_terms: { waiver_fee_xlm: 500 },
        },
        mockBreach,
        "GBUNAUTHORIZED999",
      );

      expect(res.isValid).toBe(false);
      expect(res.errors.authorization).toContain("Only the designated issuer can initiate");
    });

    it("validates cure-specific constraints (waiver, extension, restructuring)", () => {
      // Invalid extension (>90 days)
      const badExt = validateCureProposal(
        {
          breach_id: "breach-1",
          cure_type: "extension",
          title: "Overextended Cure",
          description: "Attempting to delay settlement well beyond maximum allowed threshold.",
          proposed_terms: { extension_days: 120 },
        },
        mockBreach,
        "GBISSUER123",
      );
      expect(badExt.isValid).toBe(false);
      expect(badExt.errors.extension_days).toContain("cannot exceed 90 days");

      // Invalid yield on restructuring
      const badYield = validateCureProposal(
        {
          breach_id: "breach-1",
          cure_type: "restructuring",
          title: "Restructure Rate",
          description: "Proposing invalid yield outside protocol parameters.",
          proposed_terms: { new_yield_rate: 65.0 },
        },
        mockBreach,
        "GBISSUER123",
      );
      expect(badYield.isValid).toBe(false);
      expect(badYield.errors.new_yield_rate).toContain("between 1.0% and 50.0%");
    });
  });

  describe("Voting Progress and Quorum Calculation (Show quorum and vote progress)", () => {
    it("accurately calculates quorum and approval percentages", () => {
      const active: CureProposal = {
        ...sampleProposal,
        voted_principal_for: 35000,
        voted_principal_against: 15000,
      };

      const progress = calculateVotingProgress(active);
      // Total voted = 50,000 / 100,000 = 50%
      expect(progress.totalVotedPrincipal).toBe(50000);
      expect(progress.quorumPercentCurrent).toBe(50.0);
      expect(progress.isQuorumReached).toBe(true);

      // Approval = 35,000 / 50,000 = 70.0% (threshold is 66.67%)
      expect(progress.approvalPercentCurrent).toBe(70.0);
      expect(progress.isApprovalMet).toBe(true);
      expect(progress.isPassingCurrently).toBe(true);
      expect(progress.forPercent).toBe(70.0);
      expect(progress.againstPercent).toBe(30.0);
    });

    it("identifies quorum shortfall when voting participation is below 50%", () => {
      const lowParticipation: CureProposal = {
        ...sampleProposal,
        voted_principal_for: 20000,
        voted_principal_against: 10000,
      };

      const progress = calculateVotingProgress(lowParticipation);
      expect(progress.quorumPercentCurrent).toBe(30.0);
      expect(progress.isQuorumReached).toBe(false);
      expect(progress.isPassingCurrently).toBe(false);
    });
  });

  describe("Casting Principal-Weighted Votes (Votes use eligible principal)", () => {
    it("casts vote using committed principal and prevents double voting", () => {
      const updated = castPrincipalWeightedVote(
        sampleProposal,
        "GBINVESTOR1",
        "for",
        25000,
        "2026-11-20T00:00:00Z",
      );

      expect(updated.voted_principal_for).toBe(25000);
      expect(updated.voters["gbinvestor1"]).toBeDefined();
      expect(updated.voters["gbinvestor1"].principal).toBe(25000);
      expect(updated.voters["gbinvestor1"].vote).toBe("for");

      // Double vote attempt
      expect(() =>
        castPrincipalWeightedVote(updated, "GBINVESTOR1", "against", 25000, "2026-11-20T00:00:00Z"),
      ).toThrow("already cast a vote");
    });

    it("rejects votes with 0 or negative eligible principal", () => {
      expect(() =>
        castPrincipalWeightedVote(sampleProposal, "GBINVESTOR2", "for", 0, "2026-11-20T00:00:00Z"),
      ).toThrow("Only accounts with committed principal can vote");
    });

    it("finalised proposals reject more votes", () => {
      const finalised: CureProposal = {
        ...sampleProposal,
        status: "passed",
        finalized_at: "2026-11-21T00:00:00Z",
      };

      expect(() =>
        castPrincipalWeightedVote(finalised, "GBINVESTOR3", "for", 10000, "2026-11-20T00:00:00Z"),
      ).toThrow("Cannot vote: Proposal is already passed");
    });

    it("expired proposals reject votes and show deadline error", () => {
      const pastDeadline = "2026-11-26T00:00:00Z"; // After voting_deadline (Nov 25)
      expect(() =>
        castPrincipalWeightedVote(sampleProposal, "GBINVESTOR4", "for", 10000, pastDeadline),
      ).toThrow("Proposal voting deadline has expired");
    });
  });

  describe("Outcome Evaluation & Covenant Status Update (Outcome updates covenant status)", () => {
    it("quorum success and supermajority approval passes proposal and updates covenant to extended", () => {
      const successfulProposal: CureProposal = {
        ...sampleProposal,
        cure_type: "extension",
        voted_principal_for: 60000,
        voted_principal_against: 10000,
      };

      const { finalizedProposal, newCovenantStatus, timelineEvent } = evaluateProposalOutcome(
        successfulProposal,
        "2026-11-22T00:00:00Z",
      );

      expect(finalizedProposal.status).toBe("passed");
      expect(finalizedProposal.terminal_reason).toContain("Passed with 85.71% approval");
      expect(newCovenantStatus).toBe("extended");
      expect(timelineEvent.event_type).toBe("proposal_passed");
    });

    it("waiver approval updates covenant status to waived", () => {
      const waiverProposal: CureProposal = {
        ...sampleProposal,
        cure_type: "waiver",
        voted_principal_for: 70000,
        voted_principal_against: 0,
      };

      const { newCovenantStatus } = evaluateProposalOutcome(waiverProposal, "2026-11-22T00:00:00Z");
      expect(newCovenantStatus).toBe("waived");
    });

    it("quorum failure on expiry marks proposal as expired with terminal reason and defaults covenant", () => {
      const failedQuorumProposal: CureProposal = {
        ...sampleProposal,
        voted_principal_for: 20000,
        voted_principal_against: 5000,
      };

      const pastDeadline = "2026-11-26T00:00:00Z";
      const { finalizedProposal, newCovenantStatus, timelineEvent } = evaluateProposalOutcome(
        failedQuorumProposal,
        pastDeadline,
      );

      expect(finalizedProposal.status).toBe("expired");
      expect(finalizedProposal.terminal_reason).toContain("Expired: Quorum failed (25% vs 50% required)");
      expect(newCovenantStatus).toBe("defaulted");
      expect(timelineEvent.event_type).toBe("proposal_expired");
    });

    it("quorum reached but approval failure rejects proposal and defaults covenant", () => {
      const rejectedProposal: CureProposal = {
        ...sampleProposal,
        voted_principal_for: 25000,
        voted_principal_against: 35000, // 60k voted (60% quorum), but only 41.67% for
      };

      const pastDeadline = "2026-11-26T00:00:00Z";
      const { finalizedProposal, newCovenantStatus, timelineEvent } = evaluateProposalOutcome(
        rejectedProposal,
        pastDeadline,
      );

      expect(finalizedProposal.status).toBe("rejected");
      expect(finalizedProposal.terminal_reason).toContain("Rejected: Insufficient investor approval");
      expect(newCovenantStatus).toBe("defaulted");
      expect(timelineEvent.event_type).toBe("proposal_rejected");
    });
  });
});
