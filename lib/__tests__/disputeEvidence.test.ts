import { describe, expect, it } from "vitest";
import {
  addEvidenceEvent,
  calculateDisputeSla,
  canSubmitEvidence,
  createMockDispute,
  filterAuthorizedEvents,
  resolveDispute,
  transitionToAdjudication,
  type DisputeTimelineEvent,
  type InvoiceDisputeRecord,
} from "../disputeEvidence";

const ISSUER_ADDR = "GBZXN7PIRZGNMHGA72ODXR6DTZS657SDNVWYTG52M7NA65I4Q2IT5678";
const DEBTOR_ADDR = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7";
const ARBITRATOR_ADDR = "GCKFBDVOVXZ6TKOG4DT4H7F7DF7SZXF7Y4DXV23E4LNV3KGBEGY4O2WN";
const PUBLIC_ADDR = "GD7B7Z43F24TRJ4O5GDT35G3SDGV3N2V3Y4G24DGY254G34G354GT435";

describe("disputeEvidence", () => {
  const baseTime = new Date("2026-11-25T12:00:00Z").getTime();

  it("permits evidence submission only during draft and evidence_submission stages", () => {
    expect(canSubmitEvidence("draft")).toBe(true);
    expect(canSubmitEvidence("evidence_submission")).toBe(true);
    expect(canSubmitEvidence("adjudication")).toBe(false);
    expect(canSubmitEvidence("resolved")).toBe(false);
  });

  describe("addEvidenceEvent and Adjudication Lock", () => {
    it("successfully adds text, upload, and attestation evidence during submission stage", () => {
      let dispute = createMockDispute(
        "INV-100",
        "Hardware Invoice",
        ISSUER_ADDR,
        DEBTOR_ADDR,
        "evidence_submission"
      );

      dispute = addEvidenceEvent(
        dispute,
        "issuer",
        ISSUER_ADDR,
        "text",
        "Notice of Breach",
        { textStatement: "Breach notice formally served via courier." },
        false,
        baseTime
      );

      const lastEvent = dispute.events[dispute.events.length - 1];
      expect(lastEvent.title).toBe("Notice of Breach");
      expect(lastEvent.actorRole).toBe("issuer");
      expect(lastEvent.evidenceType).toBe("text");
      expect(lastEvent.immutableHash).toMatch(/^0x[0-9a-fA-F]+/);
    });

    it("locks evidence when adjudication starts and strictly rejects new evidence", () => {
      let dispute = createMockDispute(
        "INV-100",
        "Hardware Invoice",
        ISSUER_ADDR,
        DEBTOR_ADDR,
        "evidence_submission"
      );

      // Transition into adjudication
      dispute = transitionToAdjudication(dispute, ARBITRATOR_ADDR, baseTime);
      expect(dispute.stage).toBe("adjudication");
      expect(dispute.publicStatus).toBe("in_adjudication");
      expect(dispute.arbitratorAddress).toBe(ARBITRATOR_ADDR);

      // Attempting to submit evidence must throw
      expect(() => {
        addEvidenceEvent(
          dispute,
          "debtor",
          DEBTOR_ADDR,
          "upload",
          "Late Delivery Proof",
          { fileName: "receipt.pdf" },
          false,
          baseTime + 1000
        );
      }).toThrow(/Evidence submission locked/);
    });

    it("prevents changes when dispute is resolved", () => {
      let dispute = createMockDispute(
        "INV-100",
        "Hardware Invoice",
        ISSUER_ADDR,
        DEBTOR_ADDR,
        "evidence_submission"
      );

      dispute = resolveDispute(
        dispute,
        "resolved_in_favor_of_issuer",
        "Arbitrator ruled in favor of issuer after reviewing delivery proof.",
        baseTime
      );
      expect(dispute.stage).toBe("resolved");
      expect(dispute.publicStatus).toBe("resolved_in_favor_of_issuer");

      expect(() => {
        addEvidenceEvent(
          dispute,
          "issuer",
          ISSUER_ADDR,
          "text",
          "Post-resolution note",
          { textStatement: "Extra comment" }
        );
      }).toThrow(/Evidence submission locked/);
    });
  });

  describe("filterAuthorizedEvents", () => {
    const events: DisputeTimelineEvent[] = [
      {
        eventId: "e1",
        disputeId: "d1",
        invoiceId: "inv1",
        timestamp: "2026-11-20T10:00:00Z",
        actorRole: "issuer",
        actorAddress: ISSUER_ADDR,
        evidenceType: "text",
        title: "Public Claim Description",
        isConfidential: false,
        payload: { textStatement: "Public summary of dispute" },
        immutableHash: "0x1111",
      },
      {
        eventId: "e2",
        disputeId: "d1",
        invoiceId: "inv1",
        timestamp: "2026-11-21T10:00:00Z",
        actorRole: "issuer",
        actorAddress: ISSUER_ADDR,
        evidenceType: "upload",
        title: "Proprietary Commercial Contract PDF",
        isConfidential: true,
        payload: { fileName: "contract_private.pdf" },
        immutableHash: "0x2222",
      },
    ];

    it("allows arbitrator and direct parties (issuer/debtor) to view confidential evidence", () => {
      const forArbitrator = filterAuthorizedEvents(events, "arbitrator");
      expect(forArbitrator.length).toBe(2);

      const forIssuer = filterAuthorizedEvents(events, "issuer", ISSUER_ADDR);
      expect(forIssuer.length).toBe(2);

      const forDebtor = filterAuthorizedEvents(events, "debtor", DEBTOR_ADDR);
      expect(forDebtor.length).toBe(2);
    });

    it("hides confidential evidence from public observers unless explicitly authorized", () => {
      const forPublic = filterAuthorizedEvents(events, "public", PUBLIC_ADDR);
      expect(forPublic.length).toBe(1);
      expect(forPublic[0].isConfidential).toBe(false);

      const forAuthorizedObserver = filterAuthorizedEvents(
        events,
        "public",
        PUBLIC_ADDR,
        [PUBLIC_ADDR]
      );
      expect(forAuthorizedObserver.length).toBe(2);
    });
  });

  describe("calculateDisputeSla", () => {
    it("calculates SLA age, target deadline, and required action hours remaining", () => {
      const createdAt = "2026-11-20T12:00:00Z";
      const actionDeadline = "2026-11-27T12:00:00Z";

      const sla = calculateDisputeSla(
        createdAt,
        7,
        actionDeadline,
        "debtor",
        "Debtor response required",
        baseTime
      );

      // baseTime is Nov 25, created is Nov 20 -> 5 days age
      expect(sla.slaAgeDays).toBe(5);
      expect(sla.isOverdue).toBe(false);
      // Deadline is Nov 27, now is Nov 25 -> 48 hours remaining
      expect(sla.requiredAction.hoursRemaining).toBe(48);
      expect(sla.requiredAction.targetRole).toBe("debtor");
      expect(sla.requiredAction.actionDescription).toBe("Debtor response required");
    });
  });
});
