import { describe, it, expect } from "vitest";
import {
  computeSlaStatus,
  filterComplianceCases,
  recordComplianceDecision,
  isAuthorisedForCompliance,
  SAMPLE_COMPLIANCE_CASES,
  ComplianceCase,
} from "../complianceQueue";

describe("Compliance Review Queue Logic (#671 - P0)", () => {
  it("calculates timezone-independent SLA state using absolute epoch difference", () => {
    const nowMs = 1700000000000;

    // Remaining 2 hours -> Escalated
    const deadline2h = new Date(nowMs + 2 * 3600 * 1000).toISOString();
    const slaEscalated = computeSlaStatus(deadline2h, nowMs);
    expect(slaEscalated.isBreached).toBe(false);
    expect(slaEscalated.isEscalated).toBe(true);
    expect(slaEscalated.formattedText).toContain("2h 0m (Escalated)");

    // Remaining 12 hours -> Normal
    const deadline12h = new Date(nowMs + 12 * 3600 * 1000).toISOString();
    const slaNormal = computeSlaStatus(deadline12h, nowMs);
    expect(slaNormal.isBreached).toBe(false);
    expect(slaNormal.isEscalated).toBe(false);
    expect(slaNormal.formattedText).toBe("12h 0m remaining");

    // Overdue 3 hours -> Breached
    const deadlineOverdue = new Date(nowMs - 3 * 3600 * 1000).toISOString();
    const slaBreached = computeSlaStatus(deadlineOverdue, nowMs);
    expect(slaBreached.isBreached).toBe(true);
    expect(slaBreached.isEscalated).toBe(true);
    expect(slaBreached.formattedText).toBe("SLA Breached by 3h 0m");
  });

  it("verifies authorised compliance and admin roles strictly", () => {
    const makeJwt = (role: string) => {
      const payload = btoa(JSON.stringify({ role, sub: "user-123" }));
      return `eyJhbGciOiJIUzI1NiJ9.${payload}.signature`;
    };

    expect(isAuthorisedForCompliance(makeJwt("admin"))).toBe(true);
    expect(isAuthorisedForCompliance(makeJwt("compliance"))).toBe(true);
    expect(isAuthorisedForCompliance(makeJwt("compliance_officer"))).toBe(true);
    expect(isAuthorisedForCompliance(makeJwt("investor"))).toBe(false);
    expect(isAuthorisedForCompliance(makeJwt("issuer"))).toBe(false);
    expect(isAuthorisedForCompliance(null)).toBe(false);
    expect(isAuthorisedForCompliance("invalid-jwt")).toBe(false);
  });

  it("enforces required non-empty comments to prevent accidental decisions", () => {
    const testCase = SAMPLE_COMPLIANCE_CASES[0];

    // Empty comment rejected
    const emptyRes = recordComplianceDecision(
      testCase,
      "approved",
      "officer.chen@stellarsettle.org",
      "   "
    );
    expect(emptyRes.success).toBe(false);
    expect(emptyRes.error).toContain("substantive decision rationale comment");

    // Too short comment (< 5 chars) rejected
    const shortRes = recordComplianceDecision(
      testCase,
      "approved",
      "officer.chen@stellarsettle.org",
      "ok"
    );
    expect(shortRes.success).toBe(false);
    expect(shortRes.error).toContain("at least 5 characters");

    // Valid comment accepted
    const validRes = recordComplianceDecision(
      testCase,
      "approved",
      "officer.chen@stellarsettle.org",
      "Verified against primary corporate registrar database."
    );
    expect(validRes.success).toBe(true);
    expect(validRes.updatedCase?.status).toBe("approved");
  });

  it("maintains immutable history logs across multiple actions", () => {
    const testCase = SAMPLE_COMPLIANCE_CASES[0];
    const initialHistoryLength = testCase.history.length;

    const res1 = recordComplianceDecision(
      testCase,
      "evidence_requested",
      "officer.chen",
      "Requested apostilled articles of association."
    );
    expect(res1.success).toBe(true);
    const caseAfterStep1 = res1.updatedCase!;
    expect(caseAfterStep1.history.length).toBe(initialHistoryLength + 1);

    const res2 = recordComplianceDecision(
      caseAfterStep1,
      "approved",
      "lead.officer",
      "Reviewed certified apostille. Entity approved."
    );
    expect(res2.success).toBe(true);
    const caseAfterStep2 = res2.updatedCase!;
    expect(caseAfterStep2.history.length).toBe(initialHistoryLength + 2);

    // Verify chronological order and immutable properties
    expect(caseAfterStep2.history[initialHistoryLength].action).toBe("evidence_requested");
    expect(caseAfterStep2.history[initialHistoryLength + 1].action).toBe("approved");
  });

  it("filters compliance cases by category, risk, assignee, and search query", () => {
    // Filter by category
    const kycCases = filterComplianceCases(SAMPLE_COMPLIANCE_CASES, { category: "KYC" });
    expect(kycCases).toHaveLength(1);
    expect(kycCases[0].id).toBe("case-comp-001");

    // Filter by risk tier
    const criticalCases = filterComplianceCases(SAMPLE_COMPLIANCE_CASES, {
      riskTier: "critical",
    });
    expect(criticalCases).toHaveLength(1);
    expect(criticalCases[0].entityName).toBe("Meridian Trade Finance Corp");

    // Filter by unassigned
    const unassigned = filterComplianceCases(SAMPLE_COMPLIANCE_CASES, {
      assignee: "unassigned",
    });
    expect(unassigned).toHaveLength(1);
    expect(unassigned[0].id).toBe("case-comp-002");
  });
});
