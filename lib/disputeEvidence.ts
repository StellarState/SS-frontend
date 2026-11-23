export type DisputeStage =
  | "draft"
  | "evidence_submission"
  | "adjudication"
  | "resolved";

export type DisputePublicStatus =
  | "under_review"
  | "in_adjudication"
  | "resolved_in_favor_of_issuer"
  | "resolved_in_favor_of_debtor"
  | "dismissed";

export type ParticipantRole =
  | "issuer"
  | "debtor"
  | "investor"
  | "arbitrator"
  | "public";

export type EvidenceType = "text" | "upload" | "attestation";

export interface EvidencePayload {
  // text evidence
  textStatement?: string;
  // upload evidence
  fileName?: string;
  fileCid?: string;
  fileMimeType?: string;
  fileSizeBytes?: number;
  // attestation evidence
  attestationSigner?: string;
  attestationClaim?: string;
  attestationSignature?: string;
}

export interface DisputeTimelineEvent {
  eventId: string;
  disputeId: string;
  invoiceId: string;
  timestamp: string; // ISO format
  actorRole: ParticipantRole;
  actorAddress: string;
  evidenceType: EvidenceType;
  title: string;
  isConfidential: boolean; // if true, visible only to authorized participants (issuer, debtor, arbitrator)
  payload: EvidencePayload;
  immutableHash: string;
}

export interface DisputeSlaTracker {
  createdAt: string;
  slaDaysTotal: number;
  slaAgeDays: number;
  slaDeadline: string;
  isOverdue: boolean;
  requiredAction: {
    targetRole: ParticipantRole;
    actionDescription: string;
    actionDeadline: string;
    hoursRemaining: number;
  };
}

export interface InvoiceDisputeRecord {
  disputeId: string;
  invoiceId: string;
  invoiceTitle: string;
  stage: DisputeStage;
  publicStatus: DisputePublicStatus;
  claimantRole: ParticipantRole;
  claimantAddress: string;
  respondentAddress: string;
  arbitratorAddress?: string;
  createdAt: string;
  adjudicationStartedAt?: string;
  resolvedAt?: string;
  resolutionSummary?: string;
  sla: DisputeSlaTracker;
  events: DisputeTimelineEvent[];
}

/**
 * Checks whether evidence submission or alteration is permitted.
 * When a dispute is in "adjudication" or "resolved" stage, evidence is strictly LOCKED.
 */
export function canSubmitEvidence(stage: DisputeStage): boolean {
  return stage === "draft" || stage === "evidence_submission";
}

/**
 * Calculates a simple deterministic hash simulating cryptographic content integrity.
 */
export function computeEventIntegrityHash(
  disputeId: string,
  timestamp: string,
  actorAddress: string,
  type: string
): string {
  let hash = 0;
  const str = `${disputeId}:${timestamp}:${actorAddress}:${type}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return `0x${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

/**
 * Filters timeline events according to the viewer's role and authorization.
 * Confidential evidence is restricted to authorized dispute parties (issuer, debtor, arbitrator).
 * Observers / public viewers and general investors only see non-confidential evidence.
 */
export function filterAuthorizedEvents(
  events: DisputeTimelineEvent[],
  viewerRole: ParticipantRole,
  viewerAddress?: string,
  authorizedAddresses: string[] = []
): DisputeTimelineEvent[] {
  // Arbitrator always sees everything
  if (viewerRole === "arbitrator") {
    return [...events];
  }

  const isExplicitlyAuthorized =
    viewerAddress &&
    authorizedAddresses.some(
      (addr) => addr.toLowerCase() === viewerAddress.toLowerCase()
    );

  return events.filter((evt) => {
    if (!evt.isConfidential) return true;
    if (viewerRole === "issuer" || viewerRole === "debtor") {
      return true;
    }
    return Boolean(isExplicitlyAuthorized);
  });
}

/**
 * Adds a new evidence event to the dispute timeline.
 * Throws an explicit error if the dispute is in adjudication or already resolved.
 */
export function addEvidenceEvent(
  dispute: InvoiceDisputeRecord,
  actorRole: ParticipantRole,
  actorAddress: string,
  evidenceType: EvidenceType,
  title: string,
  payload: EvidencePayload,
  isConfidential: boolean = false,
  now: number = Date.now()
): InvoiceDisputeRecord {
  if (!canSubmitEvidence(dispute.stage)) {
    throw new Error(
      `Evidence submission locked: Dispute is currently in '${dispute.stage}' stage.`
    );
  }

  const timestamp = new Date(now).toISOString();
  const eventId = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const immutableHash = computeEventIntegrityHash(
    dispute.disputeId,
    timestamp,
    actorAddress,
    evidenceType
  );

  const newEvent: DisputeTimelineEvent = {
    eventId,
    disputeId: dispute.disputeId,
    invoiceId: dispute.invoiceId,
    timestamp,
    actorRole,
    actorAddress,
    evidenceType,
    title,
    isConfidential,
    payload,
    immutableHash,
  };

  // Ensure chronological order
  const updatedEvents = [...dispute.events, newEvent].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return {
    ...dispute,
    events: updatedEvents,
  };
}

/**
 * Transitions dispute stage to 'adjudication', effectively locking all evidence.
 */
export function transitionToAdjudication(
  dispute: InvoiceDisputeRecord,
  arbitratorAddress: string,
  now: number = Date.now()
): InvoiceDisputeRecord {
  return {
    ...dispute,
    stage: "adjudication",
    publicStatus: "in_adjudication",
    arbitratorAddress,
    adjudicationStartedAt: new Date(now).toISOString(),
    sla: {
      ...dispute.sla,
      requiredAction: {
        targetRole: "arbitrator",
        actionDescription: "Arbitrator adjudication and final ruling",
        actionDeadline: new Date(now + 86_400_000 * 3).toISOString(), // 3 days
        hoursRemaining: 72,
      },
    },
  };
}

/**
 * Transitions dispute stage to 'resolved'.
 */
export function resolveDispute(
  dispute: InvoiceDisputeRecord,
  outcome: "resolved_in_favor_of_issuer" | "resolved_in_favor_of_debtor" | "dismissed",
  summary: string,
  now: number = Date.now()
): InvoiceDisputeRecord {
  return {
    ...dispute,
    stage: "resolved",
    publicStatus: outcome,
    resolvedAt: new Date(now).toISOString(),
    resolutionSummary: summary,
    sla: {
      ...dispute.sla,
      requiredAction: {
        targetRole: "public",
        actionDescription: "Dispute closed. Settlement finalized.",
        actionDeadline: new Date(now).toISOString(),
        hoursRemaining: 0,
      },
    },
  };
}

/**
 * Computes SLA timeline and deadlines.
 */
export function calculateDisputeSla(
  createdAtStr: string,
  slaDaysTotal: number = 7,
  actionDeadlineStr?: string,
  targetRole: ParticipantRole = "debtor",
  actionDescription: string = "Debtor rebuttal & proof of payment",
  now: number = Date.now()
): DisputeSlaTracker {
  const created = new Date(createdAtStr).getTime();
  const safeCreated = isNaN(created) ? now : created;
  const slaAgeDays = Math.max(0, Math.floor((now - safeCreated) / 86_400_000));
  const slaDeadline = new Date(safeCreated + slaDaysTotal * 86_400_000).toISOString();
  const isOverdue = now > safeCreated + slaDaysTotal * 86_400_000;

  const deadline = actionDeadlineStr
    ? new Date(actionDeadlineStr).getTime()
    : safeCreated + 2 * 86_400_000; // default 48h
  const hoursRemaining = Math.max(0, Math.round((deadline - now) / 3_600_000));

  return {
    createdAt: new Date(safeCreated).toISOString(),
    slaDaysTotal,
    slaAgeDays,
    slaDeadline,
    isOverdue,
    requiredAction: {
      targetRole,
      actionDescription,
      actionDeadline: new Date(deadline).toISOString(),
      hoursRemaining,
    },
  };
}

/**
 * Mock generator for invoice dispute record.
 */
export function createMockDispute(
  invoiceId: string,
  invoiceTitle: string,
  issuerAddress: string,
  debtorAddress: string,
  stage: DisputeStage = "evidence_submission"
): InvoiceDisputeRecord {
  const baseTime = Date.now() - 86_400_000 * 2; // 2 days ago
  const sla = calculateDisputeSla(
    new Date(baseTime).toISOString(),
    7,
    new Date(baseTime + 86_400_000 * 4).toISOString(),
    "debtor",
    "Debtor response & delivery documentation"
  );

  const dispute: InvoiceDisputeRecord = {
    disputeId: `disp-${invoiceId}`,
    invoiceId,
    invoiceTitle,
    stage,
    publicStatus: stage === "adjudication" ? "in_adjudication" : "under_review",
    claimantRole: "issuer",
    claimantAddress: issuerAddress,
    respondentAddress: debtorAddress,
    createdAt: new Date(baseTime).toISOString(),
    sla,
    events: [
      {
        eventId: "evt-1",
        disputeId: `disp-${invoiceId}`,
        invoiceId,
        timestamp: new Date(baseTime).toISOString(),
        actorRole: "issuer",
        actorAddress: issuerAddress,
        evidenceType: "text",
        title: "Dispute Claim Filed: Overdue Payment Without Extension",
        isConfidential: false,
        payload: {
          textStatement:
            "Debtor failed to wire settlement funds by maturity date. No commercial extension was agreed.",
        },
        immutableHash: "0x3a4b9f12",
      },
      {
        eventId: "evt-2",
        disputeId: `disp-${invoiceId}`,
        invoiceId,
        timestamp: new Date(baseTime + 3600000 * 4).toISOString(),
        actorRole: "issuer",
        actorAddress: issuerAddress,
        evidenceType: "upload",
        title: "Bill of Lading & Signed Delivery Receipt",
        isConfidential: true,
        payload: {
          fileName: "delivery_receipt_signed.pdf",
          fileCid: "QmZtmD2qt8fQgdfmkfd82ndsa8fd",
          fileMimeType: "application/pdf",
          fileSizeBytes: 245000,
        },
        immutableHash: "0x89ac3f01",
      },
      {
        eventId: "evt-3",
        disputeId: `disp-${invoiceId}`,
        invoiceId,
        timestamp: new Date(baseTime + 3600000 * 12).toISOString(),
        actorRole: "debtor",
        actorAddress: debtorAddress,
        evidenceType: "attestation",
        title: "Banking Wire Attestation Proof",
        isConfidential: false,
        payload: {
          attestationSigner: debtorAddress,
          attestationClaim: "Wire TX #994821 initiated via SWIFT on Nov 21",
          attestationSignature: "SIG_ED25519_99af281c7...",
        },
        immutableHash: "0xfe4129bc",
      },
    ],
  };

  return dispute;
}
