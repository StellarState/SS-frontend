import { describe, it, expect } from "vitest";
import {
  calculateDaysDifference,
  computeWarningThreshold,
  calculateReserveTarget,
  calculateScheduledContributions,
  projectReservePlan,
  formatReserveExportCsv,
  type Obligation,
  type ScheduledContribution,
} from "../reservePlanner";

const mockObligations: Obligation[] = [
  {
    id: "ob-1",
    title: "Supplier Alpha settlement",
    amount: 5000,
    due_date: "2026-12-01",
    status: "upcoming",
  },
  {
    id: "ob-2",
    title: "Logistics Partner beta payout",
    amount: 3000,
    due_date: "2026-12-15",
    status: "upcoming",
  },
  {
    id: "ob-3",
    title: "Historical invoice already settled",
    amount: 4000,
    due_date: "2026-11-01",
    status: "settled",
  },
];

const mockContributions: ScheduledContribution[] = [
  {
    id: "sc-1",
    label: "Weekly Treasury Transfer #1",
    amount: 2500,
    scheduled_date: "2026-11-28",
  },
  {
    id: "sc-2",
    label: "Weekly Treasury Transfer #2",
    amount: 3000,
    scheduled_date: "2026-12-10",
  },
];

describe("reservePlanner analytics (#694)", () => {
  it("calculates target matching upcoming obligations (excluding settled)", () => {
    const targetAll = calculateReserveTarget(mockObligations);
    expect(targetAll).toBe(8000); // 5000 + 3000 (excludes 4000 settled)

    // Filtered by asOfDate
    const targetEarly = calculateReserveTarget(mockObligations, "2026-12-05");
    expect(targetEarly).toBe(5000);
  });

  it("calculates scheduled contributions up to selected asOfDate", () => {
    const contEarly = calculateScheduledContributions(mockContributions, "2026-11-30");
    expect(contEarly).toBe(2500);

    const contAll = calculateScheduledContributions(mockContributions, "2026-12-15");
    expect(contAll).toBe(5500);
  });

  it("calculates shortfall at selected dates correctly", () => {
    // Current balance 1000, early date 2026-12-05
    // Target = 5000, Contributions = 2500, Projected = 1000 + 2500 = 3500
    // Shortfall = 5000 - 3500 = 1500
    const projection = projectReservePlan({
      currentBalance: 1000,
      obligations: mockObligations,
      contributions: mockContributions,
      asOfDate: "2026-12-05",
      now: "2026-11-22",
    });

    expect(projection.targetObligations).toBe(5000);
    expect(projection.scheduledContributionsTotal).toBe(2500);
    expect(projection.projectedBalance).toBe(3500);
    expect(projection.shortfall).toBe(1500);
    expect(projection.surplus).toBe(0);
    expect(projection.isFunded).toBe(false);
    expect(projection.shouldNotifyShortfall).toBe(true);
  });

  it("confirms notifications stop after target is met (funded state)", () => {
    // Current balance 6000, target 5000
    const fundedProjection = projectReservePlan({
      currentBalance: 6000,
      obligations: mockObligations,
      contributions: mockContributions,
      asOfDate: "2026-12-05",
      now: "2026-11-22",
    });

    expect(fundedProjection.shortfall).toBe(0);
    expect(fundedProjection.surplus).toBe(3500); // 6000 + 2500 - 5000
    expect(fundedProjection.isFunded).toBe(true);
    // Acceptance criterion: Notifications stop after target is met.
    expect(fundedProjection.shouldNotifyShortfall).toBe(false);
  });

  it("correctly identifies overdue states and flags overdue warning", () => {
    const overdueObligations: Obligation[] = [
      {
        id: "ob-overdue",
        title: "Defaulted supplier note",
        amount: 2000,
        due_date: "2026-11-15",
        status: "overdue",
      },
    ];

    const projection = projectReservePlan({
      currentBalance: 500,
      obligations: overdueObligations,
      contributions: [],
      asOfDate: "2026-11-22",
      now: "2026-11-22",
    });

    expect(projection.hasOverdue).toBe(true);
    expect(projection.warningLevel).toBe("overdue");
    expect(projection.isFunded).toBe(false);
    expect(projection.shortfall).toBe(1500);
  });

  describe("warning threshold tests (30d, 14d, 7d, overdue, none)", () => {
    it("returns 30d warning when days until due is between 15 and 30", () => {
      expect(computeWarningThreshold(25)).toBe("30d");
      expect(computeWarningThreshold(30)).toBe("30d");
      expect(computeWarningThreshold(15)).toBe("30d");
    });

    it("returns 14d warning when days until due is between 8 and 14", () => {
      expect(computeWarningThreshold(14)).toBe("14d");
      expect(computeWarningThreshold(10)).toBe("14d");
      expect(computeWarningThreshold(8)).toBe("14d");
    });

    it("returns 7d warning when days until due is 7 days or fewer", () => {
      expect(computeWarningThreshold(7)).toBe("7d");
      expect(computeWarningThreshold(3)).toBe("7d");
      expect(computeWarningThreshold(0)).toBe("7d");
    });

    it("returns overdue when past due or flagged overdue", () => {
      expect(computeWarningThreshold(-2)).toBe("overdue");
      expect(computeWarningThreshold(10, true)).toBe("overdue");
    });

    it("returns none when more than 30 days away or no upcoming obligations", () => {
      expect(computeWarningThreshold(45)).toBe("none");
      expect(computeWarningThreshold(null)).toBe("none");
    });
  });

  it("formats CSV export matching dashboard metrics and lists", () => {
    const projection = projectReservePlan({
      currentBalance: 5000,
      obligations: mockObligations,
      contributions: mockContributions,
      asOfDate: "2026-12-15",
      now: "2026-11-22",
    });

    const csv = formatReserveExportCsv(projection, mockObligations, mockContributions);
    expect(csv).toContain("Target Obligations,8000.00");
    expect(csv).toContain("Current Balance,5000.00");
    expect(csv).toContain("Scheduled Contributions,5500.00");
    expect(csv).toContain("Projected Balance,10500.00");
    expect(csv).toContain("Shortfall,0.00");
    expect(csv).toContain("Status,Funded");
    expect(csv).toContain("Supplier Alpha settlement");
    expect(csv).toContain("Weekly Treasury Transfer #1");
  });
});
