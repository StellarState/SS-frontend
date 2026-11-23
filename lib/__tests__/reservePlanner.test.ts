import { describe, expect, it } from "vitest";
import {
  addScheduledContribution,
  calculateReservePlannerSummary,
  calculateShortfallAtDate,
  evaluateThresholdWarnings,
  exportReservePlanToCsv,
  getDaysRemaining,
  removeScheduledContribution,
  type ScheduledContribution,
  type SettlementObligation,
} from "../reservePlanner";

describe("reservePlanner", () => {
  const baseTime = new Date("2026-11-25T00:00:00Z").getTime();

  // Due in 5 days (7-day threshold), 12 days (14-day threshold), 25 days (30-day threshold), 45 days (outside window)
  const obligations: SettlementObligation[] = [
    {
      id: "obl-1",
      invoiceId: "INV-101",
      invoiceTitle: "Logistics Fleet Alpha",
      dueDate: "2026-11-30", // in 5 days
      amount: 10000,
      currency: "USDC",
      status: "pending",
    },
    {
      id: "obl-2",
      invoiceId: "INV-102",
      invoiceTitle: "Solar Array Hardware",
      dueDate: "2026-12-07", // in 12 days
      amount: 15000,
      currency: "USDC",
      status: "pending",
    },
    {
      id: "obl-3",
      invoiceId: "INV-103",
      invoiceTitle: "Microchips Batch #4",
      dueDate: "2026-12-20", // in 25 days
      amount: 20000,
      currency: "USDC",
      status: "pending",
    },
    {
      id: "obl-4",
      invoiceId: "INV-104",
      invoiceTitle: "Copper Raw Materials",
      dueDate: "2027-01-10", // in 46 days
      amount: 30000,
      currency: "USDC",
      status: "pending",
    },
  ];

  it("calculates days remaining accurately", () => {
    expect(getDaysRemaining("2026-11-30", baseTime)).toBe(5);
    expect(getDaysRemaining("2026-12-07", baseTime)).toBe(12);
    expect(getDaysRemaining("2026-12-20", baseTime)).toBe(25);
    expect(getDaysRemaining("2026-11-20", baseTime)).toBe(-5);
  });

  it("computes shortfall at selected dates correctly", () => {
    // Current balance 8,000, obligation 10,000 due Nov 30 -> Shortfall 2,000
    const shortfall1 = calculateShortfallAtDate("2026-11-30", 8000, obligations, []);
    expect(shortfall1).toBe(2000);

    // If a contribution of 3,000 arrives before Nov 30 (Nov 28) -> Shortfall 0
    const contribs: ScheduledContribution[] = [
      {
        id: "c1",
        date: "2026-11-28",
        amount: 3000,
        sourceAccount: "Treasury Wallet",
      },
    ];
    const shortfallWithContrib = calculateShortfallAtDate(
      "2026-11-30",
      8000,
      obligations,
      contribs
    );
    expect(shortfallWithContrib).toBe(0);

    // At Dec 07: Total obligations = 10,000 + 15,000 = 25,000. Balance + contrib = 11,000 -> Shortfall = 14,000
    const shortfall2 = calculateShortfallAtDate(
      "2026-12-07",
      8000,
      obligations,
      contribs
    );
    expect(shortfall2).toBe(14000);
  });

  describe("evaluateThresholdWarnings", () => {
    it("generates 30, 14, and 7-day warnings with matching severities", () => {
      // Balance 5,000 (shortfall exists for obl-1, obl-2, obl-3)
      const warnings = evaluateThresholdWarnings(5000, obligations, [], baseTime);

      expect(warnings.length).toBe(3); // obl-4 is 46 days out (>30)

      // obl-1 is in 5 days -> 7-day threshold, critical severity
      const w1 = warnings.find((w) => w.obligationId === "obl-1");
      expect(w1?.threshold).toBe(7);
      expect(w1?.severity).toBe("critical");
      expect(w1?.message).toContain("Critical");

      // obl-2 is in 12 days -> 14-day threshold, warning severity
      const w2 = warnings.find((w) => w.obligationId === "obl-2");
      expect(w2?.threshold).toBe(14);
      expect(w2?.severity).toBe("warning");
      expect(w2?.message).toContain("Urgent");

      // obl-3 is in 25 days -> 30-day threshold, info severity
      const w3 = warnings.find((w) => w.obligationId === "obl-3");
      expect(w3?.threshold).toBe(30);
      expect(w3?.severity).toBe("info");
      expect(w3?.message).toContain("Notice");
    });

    it("stops notifications after the target is met", () => {
      // With high balance covering obligations (e.g. 100,000 USDC)
      const warnings = evaluateThresholdWarnings(100000, obligations, [], baseTime);
      expect(warnings.length).toBe(0);

      const summary = calculateReservePlannerSummary(100000, obligations, [], baseTime);
      expect(summary.targetMet).toBe(true);
      expect(summary.overallShortfall).toBe(0);
      expect(summary.activeWarnings.length).toBe(0);
    });
  });

  describe("add and remove scheduled contributions", () => {
    it("allows adding and removing scheduled contributions and recalculates projection", () => {
      let contribs: ScheduledContribution[] = [];

      contribs = addScheduledContribution(contribs, {
        date: "2026-12-01",
        amount: 25000,
        sourceAccount: "Custody Account A",
        description: "Reinvestment proceeds",
      });
      expect(contribs.length).toBe(1);
      expect(contribs[0].amount).toBe(25000);

      const addedId = contribs[0].id;
      contribs = removeScheduledContribution(contribs, addedId);
      expect(contribs.length).toBe(0);
    });
  });

  describe("summary and export", () => {
    it("handles funded vs overdue states and exports CSV matching dashboard", () => {
      const overdueObligations: SettlementObligation[] = [
        ...obligations,
        {
          id: "obl-overdue",
          invoiceId: "INV-99",
          invoiceTitle: "Overdue Machinery Lease",
          dueDate: "2026-11-20", // 5 days ago
          amount: 5000,
          currency: "USDC",
          status: "overdue",
        },
      ];

      const summary = calculateReservePlannerSummary(
        12000,
        overdueObligations,
        [{ id: "c1", date: "2026-11-28", amount: 10000, sourceAccount: "Wallet" }],
        baseTime
      );

      expect(summary.hasOverdueObligations).toBe(true);
      expect(summary.overdueCount).toBe(1);
      expect(summary.overdueAmount).toBe(5000);
      expect(summary.currentBalance).toBe(12000);
      expect(summary.totalScheduledContributions).toBe(10000);
      // Total upcoming = 10,000 + 15,000 + 20,000 + 30,000 + 5,000 = 80,000
      expect(summary.totalUpcomingObligations).toBe(80000);
      // Ending balance = 12,000 + 10,000 - 80,000 = -58,000
      expect(summary.projectedEndingBalance).toBe(-58000);
      expect(summary.overallShortfall).toBe(58000);
      expect(summary.targetMet).toBe(false);

      const csv = exportReservePlanToCsv(summary, overdueObligations, [
        { id: "c1", date: "2026-11-28", amount: 10000, sourceAccount: "Wallet" },
      ]);
      expect(csv).toContain("RESERVE TARGET PLANNER REPORT");
      expect(csv).toContain("Total Shortfall,58000");
      expect(csv).toContain("Overdue Machinery Lease");
      expect(csv).toContain("Wallet");
    });
  });
});
