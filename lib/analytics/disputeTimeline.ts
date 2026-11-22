/**
 * Invoice dispute evidence timeline analytics, authorization, SLA, and adjudication lock logic.
 * Issue #695.
 */

export type DisputeParticipantRole = "issuer" | "debtor" | "arbitrator" | "public";

export type DisputeStatus = "open" | "under_adjudication" | "resolved" | "dismissed";

export type DisputeEvidenceType = "text" | "upload" | "attestation";

export type DisputeEvidenceVisibility = "public" | "confidential" | "adjudicator_only";

export type DisputeRuling = "upheld_seller" | "upheld_debtor" | "split_settlement" | "dismissed";

export interface FileMetadata {
  fileName: string;
  fileHash: string;
  fileSize: number; // in bytes
  fileUrl?: string;
  mimeType?: string;
}

export interface AttestationMetadata {
  signerAddress: string;
  signatureHash: string;
  chainId?: string;
  attestedAt: string;
}

export interface DisputeEvidenceItem {
  id: string;
  disputeId: string;
  authorRole: DisputeParticipantRole;
  authorAddress: string;
  evidenceType: DisputeEvidenceType;
  title: string;
  content: string;
  visibility: DisputeEvidenceVisibility;
  submittedAt: string; // ISO date string
  fileMetadata?: FileMetadata;
  attestationMetadata?: AttestationMetadata;
}

export interface TimelineEvent {
  id: string;
  disputeId: string;
  eventType:
    | "dispute_opened"
    | "evidence_submitted"
    | "adjudication_started"
    | "ruling_issued"
    | "dispute_resolved"
    | "dispute_dismissed";
  actorRole: DisputeParticipantRole;
  actorAddress: string;
  title: string;
  description: string;
  timestamp: string; // ISO date string
  visibility: DisputeEvidenceVisibility;
  evidenceId?: string;
}

export interface InvoiceDispute {
  id: string;
  invoiceId: string;
  invoiceTitle: string;
  disputedAmount: number;
  issuerAddress: string;
  debtorAddress: string;
  arbitratorAddress?: string;
  status: DisputeStatus;
  createdAt: string;
  adjudicationStartedAt?: string | null;
  resolvedAt?: string | null;
  ruling?: DisputeRuling | null;
  rulingNotes?: string | null;
  evidence: DisputeEvidenceItem[];
  events: TimelineEvent[];
  /** Default SLA hours for evidence stage (e.g. 5 days = 120h) */
  evidenceSlaHours?: number;
  /** Default SLA hours for adjudication phase (e.g. 7 days = 168h) */
  adjudicationSlaHours?: number;
}

export interface DisputeSlaInfo {
  stage: "evidence" | "adjudication" | "resolved";
  elapsedHours: number;
  slaLimitHours: number;
  remainingHours: number;
  deadlineIso: string;
  isBreached: boolean;
  slaAgeDisplay: string;
}

export interface RequiredActionInfo {
  title: string;
  description: string;
  assignedRole: DisputeParticipantRole;
  deadlineIso: string;
  isUrgent: boolean;
  canAct: boolean;
}

/**
 * Checks whether evidence is locked from modification or further submissions.
 * Acceptance criteria: Evidence cannot change in adjudication.
 */
export function isEvidenceLocked(dispute: InvoiceDispute): boolean {
  return (
    dispute.status === "under_adjudication" ||
    dispute.status === "resolved" ||
    dispute.status === "dismissed" ||
    Boolean(dispute.adjudicationStartedAt)
  );
}

/**
 * Checks whether an actor role is authorized to submit evidence.
 */
export function canSubmitEvidence(
  dispute: InvoiceDispute,
  role: DisputeParticipantRole,
): boolean {
  if (isEvidenceLocked(dispute)) return false;
  return role === "issuer" || role === "debtor" || role === "arbitrator";
}

/**
 * Acceptance criteria: Participants see authorised evidence only.
 * - public visibility: visible to everyone (including public observers & investors)
 * - confidential visibility: visible only to dispute participants (issuer, debtor, arbitrator)
 * - adjudicator_only visibility: visible exclusively to arbitrator
 */
export function canViewEvidence(
  evidence: DisputeEvidenceItem | TimelineEvent,
  viewerRole: DisputeParticipantRole,
): boolean {
  if (viewerRole === "arbitrator") {
    // Arbitrator has full visibility over all evidence
    return true;
  }

  if (evidence.visibility === "public") {
    return true;
  }

  if (evidence.visibility === "confidential") {
    return viewerRole === "issuer" || viewerRole === "debtor";
  }

  if (evidence.visibility === "adjudicator_only") {
    return false;
  }

  return false;
}

/**
 * Filters timeline events according to viewer role and preserves chronological order.
 * Acceptance criteria: Timeline preserves actor role and order.
 */
export function filterAuthorizedTimeline(
  events: readonly TimelineEvent[],
  viewerRole: DisputeParticipantRole,
): TimelineEvent[] {
  return events
    .filter((event) => canViewEvidence(event, viewerRole))
    .slice()
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/**
 * Filters evidence list according to viewer authorization.
 */
export function filterAuthorizedEvidence(
  evidence: readonly DisputeEvidenceItem[],
  viewerRole: DisputeParticipantRole,
): DisputeEvidenceItem[] {
  return evidence
    .filter((item) => canViewEvidence(item, viewerRole))
    .slice()
    .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
}

/**
 * Computes SLA age, deadline, remaining hours, and breach state.
 * Scope: Show SLA age and required action.
 */
export function calculateDisputeSla(
  dispute: InvoiceDispute,
  nowInput?: string | Date,
): DisputeSlaInfo {
  const now = nowInput ? (typeof nowInput === "string" ? new Date(nowInput) : nowInput) : new Date();

  if (dispute.status === "resolved" || dispute.status === "dismissed") {
    const end = dispute.resolvedAt ? new Date(dispute.resolvedAt) : now;
    const start = new Date(dispute.createdAt);
    const elapsed = Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60)));
    return {
      stage: "resolved",
      elapsedHours: elapsed,
      slaLimitHours: (dispute.evidenceSlaHours ?? 120) + (dispute.adjudicationSlaHours ?? 168),
      remainingHours: 0,
      deadlineIso: dispute.resolvedAt ?? now.toISOString(),
      isBreached: false,
      slaAgeDisplay: `${Math.floor(elapsed / 24)}d ${elapsed % 24}h (Resolved)`,
    };
  }

  if (dispute.status === "under_adjudication") {
    const start = dispute.adjudicationStartedAt ? new Date(dispute.adjudicationStartedAt) : new Date(dispute.createdAt);
    const slaLimit = dispute.adjudicationSlaHours ?? 168; // 7 days
    const deadline = new Date(start.getTime() + slaLimit * 60 * 60 * 1000);
    const elapsedHours = Math.max(0, Math.round((now.getTime() - start.getTime()) / (1000 * 60 * 60)));
    const remainingHours = Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));

    return {
      stage: "adjudication",
      elapsedHours,
      slaLimitHours: slaLimit,
      remainingHours,
      deadlineIso: deadline.toISOString(),
      isBreached: remainingHours < 0,
      slaAgeDisplay: `${Math.floor(elapsedHours / 24)}d ${elapsedHours % 24}h`,
    };
  }

  // "open" / evidence gathering
  const start = new Date(dispute.createdAt);
  const slaLimit = dispute.evidenceSlaHours ?? 120; // 5 days
  const deadline = new Date(start.getTime() + slaLimit * 60 * 60 * 1000);
  const elapsedHours = Math.max(0, Math.round((now.getTime() - start.getTime()) / (1000 * 60 * 60)));
  const remainingHours = Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));

  return {
    stage: "evidence",
    elapsedHours,
    slaLimitHours: slaLimit,
    remainingHours,
    deadlineIso: deadline.toISOString(),
    isBreached: remainingHours < 0,
    slaAgeDisplay: `${Math.floor(elapsedHours / 24)}d ${elapsedHours % 24}h`,
  };
}

/**
 * Determines required action and deadlines based on status and user role.
 * Acceptance criteria: Required actions show deadlines.
 */
export function getRequiredAction(
  dispute: InvoiceDispute,
  userRole: DisputeParticipantRole,
  nowInput?: string | Date,
): RequiredActionInfo {
  const sla = calculateDisputeSla(dispute, nowInput);
  const isUrgent = sla.remainingHours <= 24 && !sla.isBreached;

  if (dispute.status === "open") {
    if (userRole === "debtor") {
      return {
        title: "Submit Debtor Rebuttal & Evidence",
        description: "Submit evidence or attestations contesting this invoice before adjudication starts.",
        assignedRole: "debtor",
        deadlineIso: sla.deadlineIso,
        isUrgent,
        canAct: true,
      };
    }
    if (userRole === "issuer") {
      return {
        title: "Provide Delivery & Invoicing Proof",
        description: "Upload proof of service delivery, bills of lading, or mutual agreements.",
        assignedRole: "issuer",
        deadlineIso: sla.deadlineIso,
        isUrgent,
        canAct: true,
      };
    }
    if (userRole === "arbitrator") {
      return {
        title: "Review Evidence & Initiate Adjudication",
        description: "Review preliminary submissions and transition dispute into locked adjudication.",
        assignedRole: "arbitrator",
        deadlineIso: sla.deadlineIso,
        isUrgent,
        canAct: true,
      };
    }
    return {
      title: "Evidence Gathering in Progress",
      description: "Dispute participants are submitting evidence. Public records will update upon adjudication.",
      assignedRole: "public",
      deadlineIso: sla.deadlineIso,
      isUrgent: false,
      canAct: false,
    };
  }

  if (dispute.status === "under_adjudication") {
    if (userRole === "arbitrator") {
      return {
        title: "Issue Binding Determination",
        description: "Adjudication in progress. Review immutable evidence and render a final dispute ruling.",
        assignedRole: "arbitrator",
        deadlineIso: sla.deadlineIso,
        isUrgent,
        canAct: true,
      };
    }
    return {
      title: "Adjudication in Progress (Evidence Locked)",
      description: "Evidence is locked. Arbitrator is currently formulating a binding settlement ruling.",
      assignedRole: userRole,
      deadlineIso: sla.deadlineIso,
      isUrgent: false,
      canAct: false,
    };
  }

  // Resolved or Dismissed
  return {
    title: dispute.status === "resolved" ? "Dispute Resolved" : "Dispute Dismissed",
    description: dispute.rulingNotes ?? "Final binding determination has been executed on-chain.",
    assignedRole: userRole,
    deadlineIso: dispute.resolvedAt ?? sla.deadlineIso,
    isUrgent: false,
    canAct: false,
  };
}

/**
 * Returns approved public status without leaking confidential evidence.
 * Acceptance criteria: Public status uses approved state.
 */
export function getApprovedPublicStatus(dispute: InvoiceDispute): string {
  switch (dispute.status) {
    case "open":
      return "Dispute Under Review (Evidence Phase)";
    case "under_adjudication":
      return "In Formal Adjudication (Evidence Locked)";
    case "resolved":
      if (dispute.ruling === "upheld_seller") return "Resolved: Upheld in Favor of Seller";
      if (dispute.ruling === "upheld_debtor") return "Resolved: Upheld in Favor of Debtor";
      if (dispute.ruling === "split_settlement") return "Resolved: Mutual Settlement Executed";
      return "Dispute Resolved";
    case "dismissed":
      return "Dispute Dismissed";
    default:
      return "Under Review";
  }
}

/**
 * Submits new evidence item and appends an immutable timeline event.
 * Rejects with Error if evidence is locked under adjudication.
 */
export function submitEvidence(
  dispute: InvoiceDispute,
  newEvidenceInput: Omit<DisputeEvidenceItem, "id" | "submittedAt" | "disputeId">,
  nowInput?: string | Date,
): { updatedDispute: InvoiceDispute; newEvidence: DisputeEvidenceItem } {
  if (isEvidenceLocked(dispute)) {
    throw new Error("Cannot submit evidence: Dispute is currently in adjudication or resolved (evidence locked).");
  }

  const now = nowInput ? (typeof nowInput === "string" ? new Date(nowInput) : nowInput) : new Date();
  const timestamp = now.toISOString();
  const evidenceId = `ev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const newEvidence: DisputeEvidenceItem = {
    ...newEvidenceInput,
    id: evidenceId,
    disputeId: dispute.id,
    submittedAt: timestamp,
  };

  const newEvent: TimelineEvent = {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    disputeId: dispute.id,
    eventType: "evidence_submitted",
    actorRole: newEvidenceInput.authorRole,
    actorAddress: newEvidenceInput.authorAddress,
    title: `Evidence Submitted: ${newEvidenceInput.title}`,
    description: `Submitted ${newEvidenceInput.evidenceType} evidence [${newEvidenceInput.visibility}].`,
    timestamp,
    visibility: newEvidenceInput.visibility,
    evidenceId,
  };

  const updatedDispute: InvoiceDispute = {
    ...dispute,
    evidence: [...dispute.evidence, newEvidence],
    events: [...dispute.events, newEvent],
  };

  return { updatedDispute, newEvidence };
}

/**
 * Transitions dispute into locked adjudication state.
 */
export function startAdjudication(
  dispute: InvoiceDispute,
  arbitratorAddress: string,
  nowInput?: string | Date,
): InvoiceDispute {
  if (dispute.status !== "open") {
    throw new Error(`Cannot start adjudication from status '${dispute.status}'.`);
  }

  const now = nowInput ? (typeof nowInput === "string" ? new Date(nowInput) : nowInput) : new Date();
  const timestamp = now.toISOString();

  const event: TimelineEvent = {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    disputeId: dispute.id,
    eventType: "adjudication_started",
    actorRole: "arbitrator",
    actorAddress: arbitratorAddress,
    title: "Adjudication Commenced - Evidence Locked",
    description: "The dispute has entered formal adjudication. Evidence submissions are now locked.",
    timestamp,
    visibility: "public",
  };

  return {
    ...dispute,
    status: "under_adjudication",
    adjudicationStartedAt: timestamp,
    arbitratorAddress,
    events: [...dispute.events, event],
  };
}
