/**
 * Issuer liquidity reserve target planner math and helpers for issue #694.
 *
 * This module calculates reserve targets, projected balances, shortfalls at
 * selected dates, 30/14/7-day and overdue warning thresholds, and CSV export.
 */

export interface Obligation {
  id: string;
  title: string;
  amount: number;
  due_date: string; // ISO date string YYYY-MM-DD or full ISO
  status: "upcoming" | "settled" | "overdue";
  debtor_or_recipient?: string;
}

export interface ScheduledContribution {
  id: string;
  amount: number;
  scheduled_date: string; // ISO date string YYYY-MM-DD
  label: string;
}

export type ReserveWarningThreshold = "30d" | "14d" | "7d" | "overdue" | "none";

export interface ReservePlanProjection {
  asOfDate: string;
  currentBalance: number;
  targetObligations: number;
  scheduledContributionsTotal: number;
  projectedBalance: number;
  shortfall: number;
  surplus: number;
  isFunded: boolean;
  hasOverdue: boolean;
  warningLevel: ReserveWarningThreshold;
  daysUntilDue: number | null;
  shouldNotifyShortfall: boolean;
}

export interface ProjectReservePlanParams {
  currentBalance: number;
  obligations: readonly Obligation[];
  contributions: readonly ScheduledContribution[];
  asOfDate: string;
  now?: string | Date;
}

/**
 * Calculates calendar days difference between two dates (to - from).
 */
export function calculateDaysDifference(
  from: string | Date,
  to: string | Date,
): number {
  const fromDate = typeof from === "string" ? new Date(from) : from;
  const toDate = typeof to === "string" ? new Date(to) : to;

  // Normalize to UTC midnight to avoid DST / timezone drift
  const utcFrom = Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate());
  const utcTo = Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), toDate.getUTCDate());

  return Math.round((utcTo - utcFrom) / (1000 * 60 * 60 * 24));
}

/**
 * Determines warning threshold based on days remaining until earliest due date:
 * - Overdue: < 0 days
 * - 7 days: 0 <= days <= 7
 * - 14 days: 8 <= days <= 14
 * - 30 days: 15 <= days <= 30
 * - None: > 30 days or no upcoming obligations
 */
export function computeWarningThreshold(
  daysUntilDue: number | null,
  hasOverdue: boolean = false,
): ReserveWarningThreshold {
  if (hasOverdue || (daysUntilDue !== null && daysUntilDue < 0)) {
    return "overdue";
  }
  if (daysUntilDue === null) return "none";
  if (daysUntilDue <= 7) return "7d";
  if (daysUntilDue <= 14) return "14d";
  if (daysUntilDue <= 30) return "30d";
  return "none";
}

/**
 * Target equals upcoming obligations due on or before asOfDate (or all upcoming obligations if no date provided).
 */
export function calculateReserveTarget(
  obligations: readonly Obligation[],
  asOfDate?: string,
): number {
  return obligations
    .filter((ob) => {
      if (ob.status === "settled") return false;
      if (!asOfDate) return true;
      return ob.due_date <= asOfDate;
    })
    .reduce((sum, ob) => sum + Math.max(0, Number(ob.amount || 0)), 0);
}

/**
 * Computes scheduled contributions planned on or before asOfDate.
 */
export function calculateScheduledContributions(
  contributions: readonly ScheduledContribution[],
  asOfDate?: string,
): number {
  return contributions
    .filter((c) => {
      if (!asOfDate) return true;
      return c.scheduled_date <= asOfDate;
    })
    .reduce((sum, c) => sum + Math.max(0, Number(c.amount || 0)), 0);
}

/**
 * Core projection math for the liquidity reserve target planner.
 */
export function projectReservePlan(params: ProjectReservePlanParams): ReservePlanProjection {
  const { currentBalance, obligations, contributions, asOfDate } = params;
  const now = params.now ? (typeof params.now === "string" ? new Date(params.now) : params.now) : new Date();

  const balance = Math.max(0, Number(currentBalance || 0));
  const targetObligations = calculateReserveTarget(obligations, asOfDate);
  const scheduledContributionsTotal = calculateScheduledContributions(contributions, asOfDate);
  const projectedBalance = balance + scheduledContributionsTotal;

  const shortfall = Math.max(0, targetObligations - projectedBalance);
  const surplus = Math.max(0, projectedBalance - targetObligations);
  const isFunded = shortfall === 0;

  // Check overdue obligations (due before 'now' and not settled)
  const nowIso = now.toISOString().slice(0, 10);
  const hasOverdue = obligations.some(
    (ob) => ob.status === "overdue" || (ob.status !== "settled" && ob.due_date < nowIso),
  );

  // Find earliest upcoming obligation due date
  const upcomingObligations = obligations.filter(
    (ob) => ob.status !== "settled" && ob.due_date >= nowIso,
  );

  let daysUntilDue: number | null = null;
  if (upcomingObligations.length > 0) {
    const earliestDate = upcomingObligations.reduce((earliest, ob) => {
      return ob.due_date < earliest ? ob.due_date : earliest;
    }, upcomingObligations[0].due_date);
    daysUntilDue = calculateDaysDifference(now, earliestDate);
  } else if (hasOverdue) {
    daysUntilDue = -1;
  }

  const warningLevel = computeWarningThreshold(daysUntilDue, hasOverdue);

  // Acceptance criteria: Notifications stop after target is met.
  const shouldNotifyShortfall = !isFunded && shortfall > 0;

  return {
    asOfDate,
    currentBalance: balance,
    targetObligations,
    scheduledContributionsTotal,
    projectedBalance,
    shortfall,
    surplus,
    isFunded,
    hasOverdue,
    warningLevel,
    daysUntilDue,
    shouldNotifyShortfall,
  };
}

/**
 * Exports reserve planner values to CSV format matching dashboard values.
 */
export function formatReserveExportCsv(
  projection: ReservePlanProjection,
  obligations: readonly Obligation[],
  contributions: readonly ScheduledContribution[],
): string {
  const summaryRows = [
    ["Metric", "Value"],
    ["As of Date", projection.asOfDate],
    ["Current Balance", projection.currentBalance.toFixed(2)],
    ["Target Obligations", projection.targetObligations.toFixed(2)],
    ["Scheduled Contributions", projection.scheduledContributionsTotal.toFixed(2)],
    ["Projected Balance", projection.projectedBalance.toFixed(2)],
    ["Shortfall", projection.shortfall.toFixed(2)],
    ["Surplus", projection.surplus.toFixed(2)],
    ["Status", projection.isFunded ? "Funded" : projection.hasOverdue ? "Overdue" : "Shortfall"],
    ["Warning Level", projection.warningLevel],
    [""],
    ["Upcoming Obligations"],
    ["ID", "Title", "Due Date", "Amount", "Status"],
    ...obligations.map((ob) => [
      ob.id,
      `"${ob.title.replace(/"/g, '""')}"`,
      ob.due_date,
      ob.amount.toFixed(2),
      ob.status,
    ]),
    [""],
    ["Scheduled Contributions"],
    ["ID", "Label", "Scheduled Date", "Amount"],
    ...contributions.map((c) => [
      c.id,
      `"${c.label.replace(/"/g, '""')}"`,
      c.scheduled_date,
      c.amount.toFixed(2),
    ]),
  ];

  return summaryRows.map((row) => row.join(",")).join("\n");
}
