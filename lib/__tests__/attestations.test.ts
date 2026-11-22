import { describe, expect, it } from "vitest";
import {
  activeAttestations,
  attestationBadgeState,
  hasInvalidatedAttestation,
  hasVerifiedAttestation,
} from "@/lib/attestations";
import type { Attestation } from "@/lib/api/attestations";

function attestation(overrides: Partial<Attestation> = {}): Attestation {
  return {
    id: "att-1",
    auditor: "Auditor One",
    verdict: "verified",
    datedAt: "2026-10-01T00:00:00Z",
    auditorActive: true,
    auditorRevoked: false,
    documentChanged: false,
    ...overrides,
  };
}

describe("attestation badge rules (#605)", () => {
  it("reports Verified when every active verdict is verified", () => {
    const rows = [
      attestation(),
      attestation({ id: "att-2", verdict: "verified" }),
    ];
    expect(attestationBadgeState(rows)).toBe("Verified");
  });

  it("reports Mixed when active verdicts disagree", () => {
    const rows = [attestation(), attestation({ id: "att-2", verdict: "rejected" })];
    expect(attestationBadgeState(rows)).toBe("Mixed");
  });

  it("reports Unreviewed when no active verdict exists", () => {
    expect(attestationBadgeState([])).toBe("Unreviewed");
    expect(
      attestationBadgeState([
        attestation({ auditorActive: false }),
        attestation({ id: "att-2", auditorRevoked: true }),
      ])
    ).toBe("Unreviewed");
  });

  it("excludes inactive and revoked auditors from counts", () => {
    const rows = [
      attestation(),
      attestation({ id: "att-2", auditorActive: false }),
      attestation({ id: "att-3", auditorRevoked: true }),
    ];
    expect(activeAttestations(rows).map((row) => row.id)).toEqual(["att-1"]);
  });

  it("warns only when an active attestation was invalidated", () => {
    expect(
      hasInvalidatedAttestation([attestation({ documentChanged: true })])
    ).toBe(true);
    expect(
      hasInvalidatedAttestation([
        attestation({ documentChanged: true, auditorRevoked: true }),
      ])
    ).toBe(false);
  });

  it("filters marketplace rows using verified minus invalidated counts", () => {
    expect(hasVerifiedAttestation({ attestation_summary: { verified: 2, invalidated: 0 } })).toBe(true);
    expect(hasVerifiedAttestation({ attestation_summary: { verified: 1, invalidated: 2 } })).toBe(false);
    expect(hasVerifiedAttestation({})).toBe(false);
  });
});
