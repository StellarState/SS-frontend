import { describe, it, expect } from "vitest";
import {
  calculateCovenantHeadroom,
  evaluateCovenantStatus,
  calculateCureCountdown,
  filterCovenantsForAudience,
  MonitoredCovenant,
} from "../covenantMonitoring";

describe("Issuer Covenant Monitoring Analytics (#678)", () => {
  describe("calculateCovenantHeadroom", () => {
    it("reports headroom units and values correctly for minimum covenants", () => {
      // Min DSCR of 1.25x, current 1.50x
      const { headroomValue, headroomPercent } = calculateCovenantHeadroom(1.5, 1.25, "min");
      expect(headroomValue).toBe(0.25);
      expect(headroomPercent).toBe(20.0);
    });

    it("reports headroom units and values correctly for maximum covenants", () => {
      // Max Leverage of 3.50x, current 2.80x
      const { headroomValue, headroomPercent } = calculateCovenantHeadroom(2.8, 3.5, "max");
      expect(headroomValue).toBe(0.7);
      expect(headroomPercent).toBe(20.0);
    });
  });

  describe("evaluateCovenantStatus", () => {
    const minDscrCovenant = {
      id: "cov-dscr",
      name: "Minimum DSCR",
      description: "Debt Service Coverage Ratio",
      metric_unit: "x",
      direction: "min" as const,
      threshold_value: 1.25,
      warning_threshold_value: 1.4,
      current_value: 1.5,
      last_tested_at: "2026-11-20T00:00:00Z",
      next_test_date: "2026-12-20T00:00:00Z",
      evidence_records: [],
    };

    it("triggers healthy when current value is comfortably above warning threshold", () => {
      const evalRes = evaluateCovenantStatus(minDscrCovenant, 1.6);
      expect(evalRes.status).toBe("healthy");
      expect(evalRes.isWarning).toBe(false);
      expect(evalRes.isBreached).toBe(false);
    });

    it("triggers warning before breach threshold is reached (1.25 < value <= 1.40)", () => {
      const evalRes = evaluateCovenantStatus(minDscrCovenant, 1.35);
      expect(evalRes.status).toBe("warning");
      expect(evalRes.isWarning).toBe(true);
      expect(evalRes.isBreached).toBe(false);
    });

    it("triggers breached when value drops below minimum threshold (< 1.25)", () => {
      const evalRes = evaluateCovenantStatus(minDscrCovenant, 1.15);
      expect(evalRes.status).toBe("breached");
      expect(evalRes.isBreached).toBe(true);
    });

    const maxLeverageCovenant = {
      id: "cov-lev",
      name: "Maximum Leverage Ratio",
      description: "Total Debt / EBITDA",
      metric_unit: "x",
      direction: "max" as const,
      threshold_value: 3.5,
      warning_threshold_value: 3.0,
      current_value: 2.5,
      last_tested_at: "2026-11-20T00:00:00Z",
      next_test_date: "2026-12-20T00:00:00Z",
      evidence_records: [],
    };

    it("triggers warning for max covenants before breach threshold (3.00 <= value <= 3.50)", () => {
      const evalRes = evaluateCovenantStatus(maxLeverageCovenant, 3.2);
      expect(evalRes.status).toBe("warning");
      expect(evalRes.isWarning).toBe(true);
    });

    it("triggers breach for max covenants when exceeding threshold (> 3.50)", () => {
      const evalRes = evaluateCovenantStatus(maxLeverageCovenant, 3.8);
      expect(evalRes.status).toBe("breached");
      expect(evalRes.isBreached).toBe(true);
    });
  });

  describe("calculateCureCountdown", () => {
    it("accurately computes remaining days, hours, and minutes", () => {
      const now = new Date("2026-11-22T12:00:00Z");
      // Deadline 5 days and 6 hours from now
      const deadline = new Date("2026-11-27T18:00:00Z").toISOString();

      const countdown = calculateCureCountdown(deadline, now);
      expect(countdown.isExpired).toBe(false);
      expect(countdown.days).toBe(5);
      expect(countdown.hours).toBe(6);
      expect(countdown.formattedText).toBe("5d 6h 0m remaining");
    });

    it("identifies expired cure periods accurately", () => {
      const now = new Date("2026-11-22T12:00:00Z");
      const pastDeadline = new Date("2026-11-20T12:00:00Z").toISOString();

      const countdown = calculateCureCountdown(pastDeadline, now);
      expect(countdown.isExpired).toBe(true);
      expect(countdown.formattedText).toBe("Cure period expired");
    });
  });

  describe("filterCovenantsForAudience", () => {
    const mockCovenant: MonitoredCovenant = {
      id: "cov-1",
      name: "DSCR",
      description: "Debt service",
      metric_unit: "x",
      direction: "min",
      threshold_value: 1.25,
      warning_threshold_value: 1.4,
      current_value: 1.15,
      status: "breached",
      headroom_value: -0.1,
      headroom_percent: -8.0,
      cure_deadline: "2026-12-05T00:00:00Z",
      cure_plan_summary: "Issuer deposited 50,000 XLM into debt service escrow.",
      last_tested_at: "2026-11-20T00:00:00Z",
      next_test_date: "2026-12-20T00:00:00Z",
      evidence_records: [
        {
          id: "ev-public",
          title: "Public Attestation",
          document_type: "bank_attestation",
          cid: "bafybeipublic",
          sha256_hash: "hash_pub",
          uploaded_at: "2026-11-20T00:00:00Z",
          visibility: "public",
        },
        {
          id: "ev-confidential",
          title: "Detailed Financial Audit",
          document_type: "audit_report",
          cid: "bafybeiconfidential",
          sha256_hash: "hash_priv",
          uploaded_at: "2026-11-20T00:00:00Z",
          visibility: "authorized_investors_only",
        },
      ],
    };

    it("reveals cure plan summary and confidential evidence to authorized investors", () => {
      const [res] = filterCovenantsForAudience([mockCovenant], true);
      expect(res.cure_plan_summary).toContain("deposited 50,000 XLM");
      expect(res.evidence_records).toHaveLength(2);
    });

    it("masks cure plan summary and confidential evidence for unauthorized audience", () => {
      const [res] = filterCovenantsForAudience([mockCovenant], false);
      expect(res.cure_plan_summary).toBeNull();
      expect(res.evidence_records).toHaveLength(1);
      expect(res.evidence_records[0].visibility).toBe("public");
    });
  });
});
