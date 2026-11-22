/** Pure attestation rules (#605). */

import type { Attestation } from "@/lib/api/attestations";

export type AttestationBadgeState = "Verified" | "Mixed" | "Unreviewed";

export const ATTESTATION_TOOLTIP =
  "An attestation records an auditor's verdict on a document version. It is not an audit of the invoice's commercial value and does not guarantee repayment.";

/** Revoked auditors never count, even if the backend still returns their rows. */
export function activeAttestations(attestations: readonly Attestation[]): Attestation[] {
  return attestations.filter((entry) => entry.auditorActive && !entry.auditorRevoked);
}

export function hasInvalidatedAttestation(attestations: readonly Attestation[]): boolean {
  return activeAttestations(attestations).some((entry) => entry.documentChanged);
}

export function attestationBadgeState(
  attestations: readonly Attestation[]
): AttestationBadgeState {
  const active = activeAttestations(attestations);
  if (active.length === 0) return "Unreviewed";

  const verified = active.some((entry) => entry.verdict === "verified");
  const other = active.some((entry) => entry.verdict !== "verified");
  if (verified && other) return "Mixed";
  if (verified) return "Verified";
  return active.length > 0 ? "Mixed" : "Unreviewed";
}

/** Used by the marketplace filter against optional embedded summary fields. */
export function hasVerifiedAttestation(invoice: {
  attestation_summary?: { verified?: number; total?: number; invalidated?: number } | null;
}): boolean {
  const summary = invoice.attestation_summary;
  if (!summary) return false;
  const verified = Number(summary.verified ?? 0);
  const invalidated = Number(summary.invalidated ?? 0);
  return verified > invalidated;
}
