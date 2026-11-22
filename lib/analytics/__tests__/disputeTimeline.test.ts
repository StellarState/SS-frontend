import { describe, it, expect } from "vitest";
import {
  isEvidenceLocked,
  canSubmitEvidence,
  canViewEvidence,
  filterAuthorizedEvidence,
  filterAuthorizedTimeline,
  calculateDisputeSla,
  getRequiredAction,
  getApprovedPublicStatus,
  submitEvidence,
  startAdjudication,
  type InvoiceDispute,
  type DisputeEvidenceItem,
  type TimelineEvent,
} from "../disputeTimeline";

const mockDispute: InvoiceDispute = {
  id: "disp-101",
  invoiceId: "inv-882",
  invoiceTitle: "Bulk Freight Logistics Invoice",
  disputedAmount: 45000,
  issuerAddress: "G_ISSUER_ADDR",
  debtorAddress: "G_DEBTOR_ADDR",
  status: "open",
  createdAt: "2026-11-20T10:00:00Z",
  evidence: [
    {
      id: "ev-1",
      disputeId: "disp-101",
      authorRole: "issuer",
      authorAddress: "G_ISSUER_ADDR",
      evidenceType: "upload",
      title: "Signed Bill of Lading",
      content: "Port clearance signed and stamped.",
      visibility: "public",
      submittedAt: "2026-11-20T11:00:00Z",
      fileMetadata: {
        fileName: "bill_of_lading.pdf",
        fileHash: "0xabc123456789",
        fileSize: 204800,
      },
    },
    {
      id: "ev-2",
      disputeId: "disp-101",
      authorRole: "debtor",
      authorAddress: "G_DEBTOR_ADDR",
      evidenceType: "text",
      title: "Damaged Cargo Notice",
      content: "Inspection report shows moisture damage on 40% of cargo.",
      visibility: "confidential",
      submittedAt: "2026-11-20T15:00:00Z",
    },
    {
      id: "ev-3",
      disputeId: "disp-101",
      authorRole: "arbitrator",
      authorAddress: "G_ARBITRATOR_ADDR",
      evidenceType: "attestation",
      title: "Independent Surveyor Attestation",
      content: "Surveyor certified inspection report.",
      visibility: "adjudicator_only",
      submittedAt: "2026-11-21T09:00:00Z",
      attestationMetadata: {
        signerAddress: "G_NOTARY_ORACLE",
        signatureHash: "0xdeadbeef9999",
        attestedAt: "2026-11-21T08:50:00Z",
      },
    },
  ],
  events: [
    {
      id: "evt-1",
      disputeId: "disp-101",
      eventType: "dispute_opened",
      actorRole: "debtor",
      actorAddress: "G_DEBTOR_ADDR",
      title: "Dispute Opened by Debtor",
      description: "Debtor initiated dispute regarding cargo damage.",
      timestamp: "2026-11-20T10:00:00Z",
      visibility: "public",
    },
    {
      id: "evt-2",
      disputeId: "disp-101",
      eventType: "evidence_submitted",
      actorRole: "issuer",
      actorAddress: "G_ISSUER_ADDR",
      title: "Public Proof Uploaded",
      description: "Bill of lading submitted.",
      timestamp: "2026-11-20T11:00:00Z",
      visibility: "public",
      evidenceId: "ev-1",
    },
    {
      id: "evt-3",
      disputeId: "disp-101",
      eventType: "evidence_submitted",
      actorRole: "debtor",
      actorAddress: "G_DEBTOR_ADDR",
      title: "Confidential Damage Notice",
      description: "Private damage assessment submitted.",
      timestamp: "2026-11-20T15:00:00Z",
      visibility: "confidential",
      evidenceId: "ev-2",
    },
    {
      id: "evt-4",
      disputeId: "disp-101",
      eventType: "evidence_submitted",
      actorRole: "arbitrator",
      actorAddress: "G_ARBITRATOR_ADDR",
      title: "Internal Surveyor Notes",
      description: "Confidential assessment notes.",
      timestamp: "2026-11-21T09:00:00Z",
      visibility: "adjudicator_only",
      evidenceId: "ev-3",
    },
  ],
};

describe("disputeTimeline analytics (#695)", () => {
  describe("Role-based authorization (Participants see authorised evidence only)", () => {
    it("allows arbitrator to view all evidence including adjudicator-only and confidential", () => {
      const filtered = filterAuthorizedEvidence(mockDispute.evidence, "arbitrator");
      expect(filtered.length).toBe(3);
    });

    it("allows issuer and debtor to view public and confidential, but hides adjudicator-only", () => {
      const issuerView = filterAuthorizedEvidence(mockDispute.evidence, "issuer");
      expect(issuerView.map((e) => e.id)).toEqual(["ev-1", "ev-2"]);

      const debtorView = filterAuthorizedEvidence(mockDispute.evidence, "debtor");
      expect(debtorView.map((e) => e.id)).toEqual(["ev-1", "ev-2"]);
    });

    it("restricts public observers to public evidence only", () => {
      const publicView = filterAuthorizedEvidence(mockDispute.evidence, "public");
      expect(publicView.map((e) => e.id)).toEqual(["ev-1"]);
    });

    it("filters timeline events preserving authorized visibility and chronological order", () => {
      const publicTimeline = filterAuthorizedTimeline(mockDispute.events, "public");
      expect(publicTimeline.map((evt) => evt.id)).toEqual(["evt-1", "evt-2"]);

      const partyTimeline = filterAuthorizedTimeline(mockDispute.events, "debtor");
      expect(partyTimeline.map((evt) => evt.id)).toEqual(["evt-1", "evt-2", "evt-3"]);

      const arbitratorTimeline = filterAuthorizedTimeline(mockDispute.events, "arbitrator");
      expect(arbitratorTimeline.map((evt) => evt.id)).toEqual(["evt-1", "evt-2", "evt-3", "evt-4"]);
    });
  });

  describe("Evidence locking in adjudication (Evidence cannot change in adjudication)", () => {
    it("allows evidence submission in open state", () => {
      expect(isEvidenceLocked(mockDispute)).toBe(false);
      expect(canSubmitEvidence(mockDispute, "issuer")).toBe(true);

      const { updatedDispute, newEvidence } = submitEvidence(
        mockDispute,
        {
          authorRole: "issuer",
          authorAddress: "G_ISSUER_ADDR",
          evidenceType: "text",
          title: "Rebuttal Statement",
          content: "Temperature logs show correct storage conditions throughout transit.",
          visibility: "confidential",
        },
        "2026-11-21T12:00:00Z",
      );

      expect(updatedDispute.evidence.length).toBe(4);
      expect(updatedDispute.events.length).toBe(5);
      expect(newEvidence.title).toBe("Rebuttal Statement");
    });

    it("locks evidence once adjudication starts and rejects new submissions", () => {
      const adjudicatedDispute = startAdjudication(mockDispute, "G_ARBITRATOR_ADDR", "2026-11-21T14:00:00Z");

      expect(adjudicatedDispute.status).toBe("under_adjudication");
      expect(isEvidenceLocked(adjudicatedDispute)).toBe(true);
      expect(canSubmitEvidence(adjudicatedDispute, "issuer")).toBe(false);
      expect(canSubmitEvidence(adjudicatedDispute, "debtor")).toBe(false);

      expect(() => {
        submitEvidence(adjudicatedDispute, {
          authorRole: "debtor",
          authorAddress: "G_DEBTOR_ADDR",
          evidenceType: "text",
          title: "Late submission",
          content: "Attempting to change evidence during adjudication",
          visibility: "confidential",
        });
      }).toThrow(/evidence locked/i);
    });
  });

  describe("SLA Age and Required Actions (Required actions show deadlines)", () => {
    it("calculates SLA age and remaining hours for open evidence gathering phase", () => {
      const sla = calculateDisputeSla(mockDispute, "2026-11-21T10:00:00Z"); // 24h after open
      expect(sla.stage).toBe("evidence");
      expect(sla.elapsedHours).toBe(24);
      expect(sla.slaLimitHours).toBe(120);
      expect(sla.remainingHours).toBe(96);
      expect(sla.isBreached).toBe(false);
      expect(sla.slaAgeDisplay).toBe("1d 0h");
    });

    it("provides role-specific required actions with explicit deadlines", () => {
      const debtorAction = getRequiredAction(mockDispute, "debtor", "2026-11-21T10:00:00Z");
      expect(debtorAction.assignedRole).toBe("debtor");
      expect(debtorAction.canAct).toBe(true);
      expect(debtorAction.deadlineIso).toBeTruthy();

      const issuerAction = getRequiredAction(mockDispute, "issuer", "2026-11-21T10:00:00Z");
      expect(issuerAction.assignedRole).toBe("issuer");
      expect(issuerAction.canAct).toBe(true);
    });

    it("shows locked guidance to parties during adjudication stage", () => {
      const adjudicatedDispute = startAdjudication(mockDispute, "G_ARBITRATOR_ADDR", "2026-11-21T14:00:00Z");
      const actionForParty = getRequiredAction(adjudicatedDispute, "issuer", "2026-11-21T16:00:00Z");

      expect(actionForParty.canAct).toBe(false);
      expect(actionForParty.title).toContain("Evidence Locked");
    });
  });

  describe("Public status and resolution (Public status uses approved state)", () => {
    it("returns approved public status strings for all phases", () => {
      expect(getApprovedPublicStatus(mockDispute)).toBe("Dispute Under Review (Evidence Phase)");

      const adjudicated = startAdjudication(mockDispute, "G_ARBITRATOR_ADDR");
      expect(getApprovedPublicStatus(adjudicated)).toBe("In Formal Adjudication (Evidence Locked)");

      const resolved: InvoiceDispute = {
        ...adjudicated,
        status: "resolved",
        ruling: "upheld_seller",
        rulingNotes: "Claim upheld based on certified bill of lading.",
      };
      expect(getApprovedPublicStatus(resolved)).toBe("Resolved: Upheld in Favor of Seller");
    });

    it("covers resolved dispute state with completed SLA and immutable records", () => {
      const resolvedDispute: InvoiceDispute = {
        ...mockDispute,
        status: "resolved",
        adjudicationStartedAt: "2026-11-21T14:00:00Z",
        resolvedAt: "2026-11-22T08:00:00Z",
        ruling: "split_settlement",
        rulingNotes: "Parties agreed on 50/50 freight adjustment.",
      };

      expect(isEvidenceLocked(resolvedDispute)).toBe(true);
      const sla = calculateDisputeSla(resolvedDispute, "2026-11-22T12:00:00Z");
      expect(sla.stage).toBe("resolved");
      expect(sla.slaAgeDisplay).toContain("Resolved");
    });
  });
});
