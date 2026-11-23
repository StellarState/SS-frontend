/**
 * Invoice insurance coverage and claims analytics (#686).
 *
 * Implements coverage limit reconciliation to face value,
 * signed evidence validation for claims, role-authorized claim status,
 * post-resolution protection updates, and secure document viewing.
 */

export type PolicyStatus = "active" | "claimed" | "expired" | "exhausted";
export type ProtectionLevel = "full" | "partial" | "none";
export type ClaimStatus = "submitted" | "under_review" | "approved" | "denied";
export type IncidentType = "default" | "fraud" | "bankruptcy" | "force_majeure";
export type UserInsuranceRole = "investor_claimant" | "underwriter_adjudicator" | "public_observer";

export interface EvidenceDocument {
  id: string;
  file_name: string;
  file_hash: string; // e.g. IPFS CID or SHA-256
  signed_by: string;
  signature: string;
  uploaded_at: string;
  secure_view_url: string;
}

export interface InsurancePolicy {
  id: string;
  invoice_id: string;
  invoice_face_value: number;
  provider_name: string;
  policy_number: string;
  initial_coverage_limit: number;
  remaining_coverage_limit: number;
  coverage_ratio_percent: number;
  deductible_amount: number;
  premium_bps: number; // e.g. 150 = 1.5%
  premium_amount: number;
  status: PolicyStatus;
  effective_date: string;
  expiry_date: string;
  protection_level: ProtectionLevel;
  underwriter_address: string;
}

export interface InsuranceClaim {
  id: string;
  policy_id: string;
  invoice_id: string;
  claimant_address: string;
  incident_date: string;
  incident_type: IncidentType;
  incident_description: string;
  claimed_amount: number;
  payout_amount?: number | null;
  evidence: EvidenceDocument[];
  status: ClaimStatus;
  adjudicated_by?: string | null;
  adjudicated_at?: string | null;
  denial_reason?: string | null;
  payout_tx_hash?: string | null;
  created_at: string;
}

export interface ClaimSubmissionInput {
  incident_date: string;
  incident_type: IncidentType;
  incident_description: string;
  claimed_amount: number;
  evidence: EvidenceDocument[];
}

export interface ClaimValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface CoverageReconciliation {
  isFullyCovered: boolean;
  coverageLimit: number;
  faceValue: number;
  shortfallAmount: number;
  coverageRatioPercent: number;
  effectiveProtection: ProtectionLevel;
}

/**
 * Reconciles insurance coverage limit to invoice face value.
 * Acceptance criteria: Coverage limit reconciles to face value.
 */
export function reconcileCoverageToFaceValue(
  coverageLimit: number,
  faceValue: number,
): CoverageReconciliation {
  const safeFaceValue = Math.max(0, faceValue);
  const boundedCoverage = Math.max(0, Math.min(coverageLimit, safeFaceValue));
  const shortfallAmount = Math.max(0, safeFaceValue - boundedCoverage);

  let coverageRatioPercent = 0;
  if (safeFaceValue > 0) {
    coverageRatioPercent = Number(((boundedCoverage / safeFaceValue) * 100).toFixed(2));
  }

  let effectiveProtection: ProtectionLevel = "none";
  if (coverageRatioPercent >= 100) {
    effectiveProtection = "full";
  } else if (coverageRatioPercent > 0) {
    effectiveProtection = "partial";
  }

  return {
    isFullyCovered: coverageRatioPercent >= 100,
    coverageLimit: boundedCoverage,
    faceValue: safeFaceValue,
    shortfallAmount,
    coverageRatioPercent,
    effectiveProtection,
  };
}

/**
 * Validates claim submission requirements.
 * Acceptance criteria: Claims require evidence; Evidence uses secure document viewing.
 */
export function validateClaimSubmission(
  input: ClaimSubmissionInput,
  policy: InsurancePolicy,
  nowInput?: string | Date | number,
): ClaimValidationResult {
  const errors: Record<string, string> = {};

  const nowMs =
    nowInput instanceof Date
      ? nowInput.getTime()
      : typeof nowInput === "string"
        ? new Date(nowInput).getTime()
        : typeof nowInput === "number"
          ? nowInput
          : Date.now();

  // Validate incident date
  if (!input.incident_date) {
    errors.incident_date = "Incident date is required.";
  } else {
    const incidentMs = new Date(input.incident_date).getTime();
    if (isNaN(incidentMs)) {
      errors.incident_date = "Invalid incident date format.";
    } else if (incidentMs > nowMs) {
      errors.incident_date = "Incident date cannot be in the future.";
    }
  }

  // Validate description
  if (!input.incident_description || input.incident_description.trim().length < 15) {
    errors.incident_description = "Incident description must be at least 15 characters.";
  }

  // Validate claimed amount against policy remaining limit and deductible
  const maxNetClaimable = Math.max(0, policy.remaining_coverage_limit - policy.deductible_amount);
  if (!Number.isFinite(input.claimed_amount) || input.claimed_amount <= 0) {
    errors.claimed_amount = "Claimed amount must be greater than 0.";
  } else if (input.claimed_amount > policy.remaining_coverage_limit) {
    errors.claimed_amount = `Claim exceeds policy remaining coverage limit (${policy.remaining_coverage_limit.toLocaleString("en-US")} XLM).`;
  } else if (input.claimed_amount <= policy.deductible_amount) {
    errors.claimed_amount = `Claimed amount must exceed policy deductible (${policy.deductible_amount.toLocaleString("en-US")} XLM).`;
  }

  // Require signed evidence
  if (!input.evidence || input.evidence.length === 0) {
    errors.evidence = "At least one signed evidence document is required to file a claim.";
  } else {
    const invalidEvidence = input.evidence.some(
      (doc) => !doc.file_hash || !doc.signature || !doc.secure_view_url,
    );
    if (invalidEvidence) {
      errors.evidence = "All uploaded evidence must have a verified signature, document hash, and secure view URL.";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Checks authorization role for claim visibility and action execution.
 * Acceptance criteria: Status is role-authorised.
 */
export function checkClaimRoleAuthorization(
  userAddress: string | null | undefined,
  policy: InsurancePolicy,
  claim?: InsuranceClaim | null,
): { role: UserInsuranceRole; canAdjudicate: boolean; canFileClaim: boolean } {
  if (!userAddress) {
    return { role: "public_observer", canAdjudicate: false, canFileClaim: false };
  }

  const normUser = userAddress.trim().toLowerCase();
  const normUnderwriter = policy.underwriter_address.trim().toLowerCase();
  const normClaimant = claim ? claim.claimant_address.trim().toLowerCase() : null;

  if (normUser === normUnderwriter) {
    return { role: "underwriter_adjudicator", canAdjudicate: true, canFileClaim: false };
  }

  if (normClaimant && normUser === normClaimant) {
    return { role: "investor_claimant", canAdjudicate: false, canFileClaim: false };
  }

  return {
    role: "investor_claimant",
    canAdjudicate: false,
    canFileClaim: policy.status === "active" && policy.remaining_coverage_limit > 0,
  };
}

/**
 * Adjudicates a claim and updates policy protection limits.
 * Acceptance criteria: Resolution updates protection; Tests cover eligible and denied claims.
 */
export function adjudicateClaim(
  claim: InsuranceClaim,
  policy: InsurancePolicy,
  decision: "approved" | "denied",
  options: {
    payoutAmount?: number;
    denialReason?: string;
    adjudicatorAddress: string;
    txHash?: string;
  },
  nowInput?: string | Date | number,
): { updatedClaim: InsuranceClaim; updatedPolicy: InsurancePolicy } {
  const auth = checkClaimRoleAuthorization(options.adjudicatorAddress, policy, claim);
  if (!auth.canAdjudicate) {
    throw new Error("Unauthorized. Only the designated underwriter can adjudicate claims.");
  }

  if (claim.status !== "submitted" && claim.status !== "under_review") {
    throw new Error(`Cannot adjudicate claim with status ${claim.status}.`);
  }

  const nowIso =
    nowInput instanceof Date
      ? nowInput.toISOString()
      : typeof nowInput === "string"
        ? new Date(nowInput).toISOString()
        : typeof nowInput === "number"
          ? new Date(nowInput).toISOString()
          : new Date().toISOString();

  if (decision === "denied") {
    const updatedClaim: InsuranceClaim = {
      ...claim,
      status: "denied",
      adjudicated_by: options.adjudicatorAddress,
      adjudicated_at: nowIso,
      denial_reason: options.denialReason || "Claim denied after policy terms verification.",
      payout_amount: 0,
    };

    // Denied claims do not deduct coverage
    return { updatedClaim, updatedPolicy: policy };
  }

  // Decision === "approved"
  const approvedPayout = options.payoutAmount ?? Math.max(0, claim.claimed_amount - policy.deductible_amount);
  const remainingCoverage = Math.max(0, policy.remaining_coverage_limit - approvedPayout);

  let newPolicyStatus: PolicyStatus = policy.status;
  let newProtectionLevel: ProtectionLevel = policy.protection_level;

  if (remainingCoverage <= 0) {
    newPolicyStatus = "exhausted";
    newProtectionLevel = "none";
  } else if (remainingCoverage < policy.initial_coverage_limit) {
    newPolicyStatus = "claimed";
    newProtectionLevel = "partial";
  }

  const newRatio = policy.invoice_face_value > 0
    ? Number(((remainingCoverage / policy.invoice_face_value) * 100).toFixed(2))
    : 0;

  const updatedClaim: InsuranceClaim = {
    ...claim,
    status: "approved",
    adjudicated_by: options.adjudicatorAddress,
    adjudicated_at: nowIso,
    payout_amount: approvedPayout,
    payout_tx_hash: options.txHash ?? `tx_${Date.now()}`,
  };

  const updatedPolicy: InsurancePolicy = {
    ...policy,
    remaining_coverage_limit: remainingCoverage,
    status: newPolicyStatus,
    protection_level: newProtectionLevel,
    coverage_ratio_percent: newRatio,
  };

  return { updatedClaim, updatedPolicy };
}
