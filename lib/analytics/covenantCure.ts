/**
 * Issuer covenant breach proposal and cure flow analytics (#684).
 *
 * Implements issuer-initiated cure proposals (waiver, extension, restructuring),
 * principal-weighted investor voting, quorum and approval progress tracking,
 * expiration guards, finalization locks, and covenant timeline status updates.
 */

export type CovenantStatus =
  | "compliant"
  | "in_breach"
  | "cure_proposed"
  | "waived"
  | "extended"
  | "restructured"
  | "defaulted";

export type CureType = "waiver" | "extension" | "restructuring";

export type ProposalStatus = "active" | "passed" | "rejected" | "expired";

export interface CovenantBreach {
  id: string;
  invoice_id: string;
  issuer_address: string;
  covenant_name: string;
  threshold_metric: string;
  threshold_value: number;
  actual_value: number;
  breach_detected_at: string;
  status: CovenantStatus;
  cure_deadline: string;
}

export interface ProposedTerms {
  extension_days?: number;
  waiver_fee_xlm?: number;
  new_yield_rate?: number;
  additional_collateral_xlm?: number;
  notes?: string;
}

export interface CureProposal {
  id: string;
  breach_id: string;
  invoice_id: string;
  issuer_address: string;
  cure_type: CureType;
  title: string;
  description: string;
  proposed_terms: ProposedTerms;
  evidence_urls: string[];
  voting_deadline: string;
  quorum_percent_required: number; // default: 50.0%
  approval_threshold_percent: number; // default: 66.67% of voting principal
  total_eligible_principal: number;
  voted_principal_for: number;
  voted_principal_against: number;
  voters: Record<string, { vote: "for" | "against"; principal: number; voted_at: string }>;
  status: ProposalStatus;
  terminal_reason?: string | null;
  finalized_at?: string | null;
  created_at: string;
}

export interface CovenantTimelineEvent {
  id: string;
  breach_id: string;
  timestamp: string;
  event_type:
    | "breach_detected"
    | "cure_proposed"
    | "vote_cast"
    | "quorum_reached"
    | "proposal_passed"
    | "proposal_rejected"
    | "proposal_expired"
    | "covenant_cured"
    | "covenant_defaulted";
  title: string;
  details: string;
  actor_address?: string | null;
}

export interface CreateProposalInput {
  breach_id: string;
  cure_type: CureType;
  title: string;
  description: string;
  proposed_terms: ProposedTerms;
  evidence_urls?: string[];
  voting_duration_days?: number; // 1 to 14 days
}

export interface VotingProgress {
  totalVotedPrincipal: number;
  quorumPercentCurrent: number;
  isQuorumReached: boolean;
  approvalPercentCurrent: number;
  isApprovalMet: boolean;
  isPassingCurrently: boolean;
  forPercent: number;
  againstPercent: number;
}

export const DEFAULT_QUORUM_PERCENT = 50.0;
export const DEFAULT_APPROVAL_PERCENT = 66.67;
export const MIN_VOTING_DAYS = 1;
export const MAX_VOTING_DAYS = 14;

/**
 * Validates a cure proposal before submission.
 * Acceptance criteria: Only authorised issuers initiate proposals.
 */
export function validateCureProposal(
  input: CreateProposalInput,
  breach: CovenantBreach,
  activeWalletAddress: string | null | undefined,
): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!activeWalletAddress) {
    errors.authorization = "Wallet connection is required to submit a cure proposal.";
    return { isValid: false, errors };
  }

  // Authorization check: only the issuer associated with this breach can propose cures
  if (activeWalletAddress.trim().toLowerCase() !== breach.issuer_address.trim().toLowerCase()) {
    errors.authorization = "Unauthorized: Only the designated issuer can initiate a covenant cure proposal.";
  }

  // Title validation
  if (!input.title || input.title.trim().length < 5) {
    errors.title = "Proposal title must be at least 5 characters.";
  }

  // Description validation
  if (!input.description || input.description.trim().length < 15) {
    errors.description = "Proposal description and cure plan must be at least 15 characters.";
  }

  // Cure-type specific validation
  if (input.cure_type === "extension") {
    if (!input.proposed_terms.extension_days || input.proposed_terms.extension_days <= 0) {
      errors.extension_days = "Extension cure requires a positive duration in days.";
    } else if (input.proposed_terms.extension_days > 90) {
      errors.extension_days = "Extension duration cannot exceed 90 days.";
    }
  } else if (input.cure_type === "waiver") {
    if (
      input.proposed_terms.waiver_fee_xlm !== undefined &&
      input.proposed_terms.waiver_fee_xlm < 0
    ) {
      errors.waiver_fee_xlm = "Waiver fee cannot be negative.";
    }
  } else if (input.cure_type === "restructuring") {
    if (
      input.proposed_terms.new_yield_rate !== undefined &&
      (input.proposed_terms.new_yield_rate < 1.0 || input.proposed_terms.new_yield_rate > 50.0)
    ) {
      errors.new_yield_rate = "Restructured yield rate must be between 1.0% and 50.0%.";
    }
  }

  // Duration validation
  const days = input.voting_duration_days ?? 7;
  if (days < MIN_VOTING_DAYS || days > MAX_VOTING_DAYS) {
    errors.voting_duration_days = `Voting duration must be between ${MIN_VOTING_DAYS} and ${MAX_VOTING_DAYS} days.`;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Calculates principal-weighted voting progress, quorum, and approval thresholds.
 * Acceptance criteria: Show quorum and vote progress.
 */
export function calculateVotingProgress(proposal: CureProposal): VotingProgress {
  const totalVoted = proposal.voted_principal_for + proposal.voted_principal_against;
  const eligible = Math.max(1, proposal.total_eligible_principal);

  const quorumPercentCurrent = Number(((totalVoted / eligible) * 100).toFixed(2));
  const isQuorumReached = quorumPercentCurrent >= proposal.quorum_percent_required;

  let approvalPercentCurrent = 0;
  let forPercent = 0;
  let againstPercent = 0;

  if (totalVoted > 0) {
    approvalPercentCurrent = Number(((proposal.voted_principal_for / totalVoted) * 100).toFixed(2));
    forPercent = approvalPercentCurrent;
    againstPercent = Number(((proposal.voted_principal_against / totalVoted) * 100).toFixed(2));
  }

  const isApprovalMet = approvalPercentCurrent >= proposal.approval_threshold_percent;
  const isPassingCurrently = isQuorumReached && isApprovalMet;

  return {
    totalVotedPrincipal: totalVoted,
    quorumPercentCurrent,
    isQuorumReached,
    approvalPercentCurrent,
    isApprovalMet,
    isPassingCurrently,
    forPercent,
    againstPercent,
  };
}

/**
 * Casts a principal-weighted investor vote on a cure proposal.
 * Acceptance criteria: Votes use eligible principal; Finalised proposals reject more votes; Expired proposals show a terminal reason.
 */
export function castPrincipalWeightedVote(
  proposal: CureProposal,
  voterAddress: string | null | undefined,
  vote: "for" | "against",
  eligiblePrincipal: number,
  nowInput?: string | Date | number,
): CureProposal {
  if (!voterAddress) {
    throw new Error("Wallet connection required to vote.");
  }

  const nowMs =
    nowInput instanceof Date
      ? nowInput.getTime()
      : typeof nowInput === "string"
        ? new Date(nowInput).getTime()
        : typeof nowInput === "number"
          ? nowInput
          : Date.now();

  const deadlineMs = new Date(proposal.voting_deadline).getTime();

  // Finalised proposals reject more votes
  if (proposal.status !== "active") {
    throw new Error(`Cannot vote: Proposal is already ${proposal.status}.`);
  }

  // Expired proposals reject votes
  if (deadlineMs <= nowMs) {
    throw new Error("Cannot vote: Proposal voting deadline has expired.");
  }

  // Votes use eligible principal
  if (!Number.isFinite(eligiblePrincipal) || eligiblePrincipal <= 0) {
    throw new Error("Ineligible: Only accounts with committed principal can vote.");
  }

  const normVoter = voterAddress.trim().toLowerCase();
  if (proposal.voters[normVoter]) {
    throw new Error("Account has already cast a vote on this proposal.");
  }

  const newVoters = {
    ...proposal.voters,
    [normVoter]: {
      vote,
      principal: eligiblePrincipal,
      voted_at: new Date(nowMs).toISOString(),
    },
  };

  const newFor = vote === "for" ? proposal.voted_principal_for + eligiblePrincipal : proposal.voted_principal_for;
  const newAgainst =
    vote === "against" ? proposal.voted_principal_against + eligiblePrincipal : proposal.voted_principal_against;

  return {
    ...proposal,
    voted_principal_for: newFor,
    voted_principal_against: newAgainst,
    voters: newVoters,
  };
}

/**
 * Evaluates proposal finalization outcome after deadline or quorum.
 * Acceptance criteria: Finalised proposals reject more votes; Expired proposals show a terminal reason; Outcome updates covenant status.
 */
export function evaluateProposalOutcome(
  proposal: CureProposal,
  nowInput?: string | Date | number,
): {
  finalizedProposal: CureProposal;
  newCovenantStatus: CovenantStatus;
  timelineEvent: CovenantTimelineEvent;
} {
  const nowMs =
    nowInput instanceof Date
      ? nowInput.getTime()
      : typeof nowInput === "string"
        ? new Date(nowInput).getTime()
        : typeof nowInput === "number"
          ? nowInput
          : Date.now();

  const deadlineMs = new Date(proposal.voting_deadline).getTime();
  const isTimeExpired = deadlineMs <= nowMs;

  const progress = calculateVotingProgress(proposal);
  const nowIso = new Date(nowMs).toISOString();

  let finalStatus: ProposalStatus = proposal.status;
  let terminalReason: string | null = null;
  let newCovenantStatus: CovenantStatus = "in_breach";

  if (progress.isQuorumReached && progress.isApprovalMet) {
    // Proposal Passed
    finalStatus = "passed";
    terminalReason = `Passed with ${progress.approvalPercentCurrent}% approval exceeding ${proposal.approval_threshold_percent}% threshold.`;

    if (proposal.cure_type === "waiver") {
      newCovenantStatus = "waived";
    } else if (proposal.cure_type === "extension") {
      newCovenantStatus = "extended";
    } else {
      newCovenantStatus = "restructured";
    }
  } else if (isTimeExpired) {
    if (!progress.isQuorumReached) {
      finalStatus = "expired";
      terminalReason = `Expired: Quorum failed (${progress.quorumPercentCurrent}% vs ${proposal.quorum_percent_required}% required).`;
      newCovenantStatus = "defaulted";
    } else {
      finalStatus = "rejected";
      terminalReason = `Rejected: Insufficient investor approval (${progress.approvalPercentCurrent}% vs ${proposal.approval_threshold_percent}% required).`;
      newCovenantStatus = "defaulted";
    }
  } else {
    // Still active
    return {
      finalizedProposal: proposal,
      newCovenantStatus: "cure_proposed",
      timelineEvent: {
        id: `ev-${Date.now()}`,
        breach_id: proposal.breach_id,
        timestamp: nowIso,
        event_type: "vote_cast",
        title: "Vote Recorded",
        details: `Current progress: ${progress.quorumPercentCurrent}% quorum, ${progress.approvalPercentCurrent}% approval.`,
      },
    };
  }

  const finalizedProposal: CureProposal = {
    ...proposal,
    status: finalStatus,
    terminal_reason: terminalReason,
    finalized_at: nowIso,
  };

  const timelineEvent: CovenantTimelineEvent = {
    id: `ev-${Date.now()}`,
    breach_id: proposal.breach_id,
    timestamp: nowIso,
    event_type:
      finalStatus === "passed"
        ? "proposal_passed"
        : finalStatus === "expired"
          ? "proposal_expired"
          : "proposal_rejected",
    title:
      finalStatus === "passed"
        ? `Cure Proposal Passed (${proposal.cure_type.toUpperCase()})`
        : `Cure Proposal ${finalStatus === "expired" ? "Expired" : "Rejected"}`,
    details: terminalReason ?? "Proposal voting concluded.",
    actor_address: proposal.issuer_address,
  };

  return { finalizedProposal, newCovenantStatus, timelineEvent };
}
