export interface SettlementObligation {
  id: string;
  invoiceId: string;
  invoiceTitle: string;
  dueDate: string; // ISO format YYYY-MM-DD
  amount: number;
  currency: string;
  status: "pending" | "settled" | "overdue";
}

export interface ScheduledContribution {
  id: string;
  date: string; // ISO format YYYY-MM-DD
  amount: number;
  sourceAccount: string;
  description?: string;
  recurring?: "none" | "weekly" | "monthly";
}

export type WarningSeverity = "info" | "warning" | "critical";

export interface ReserveThresholdWarning {
  obligationId: string;
  invoiceId: string;
  invoiceTitle: string;
  dueDate: string;
  daysRemaining: number;
  threshold: 30 | 14 | 7;
  severity: WarningSeverity;
  requiredAmount: number;
  projectedShortfall: number;
  message: string;
}

export interface ReservePlannerSummary {
  currentBalance: number;
  totalUpcomingObligations: number;
  totalScheduledContributions: number;
  projectedEndingBalance: number;
  overallShortfall: number;
  targetMet: boolean;
  activeWarnings: ReserveThresholdWarning[];
  hasOverdueObligations: boolean;
  overdueCount: number;
  overdueAmount: number;
  currency: string;
}

/**
 * Calculates days remaining until a due date from a reference timestamp.
 */
export function getDaysRemaining(dueDateStr: string, now: number = Date.now()): number {
  const target = new Date(dueDateStr).getTime();
  if (isNaN(target)) return 0;
  return Math.ceil((target - now) / 86_400_000);
}

/**
 * Calculates the shortfall at a given target date:
 * Shortfall = max(0, obligationsDueUpToDate - (currentBalance + contributionsUpToDate))
 */
export function calculateShortfallAtDate(
  targetDateStr: string,
  currentBalance: number,
  obligations: SettlementObligation[],
  contributions: ScheduledContribution[]
): number {
  const targetTime = new Date(targetDateStr).getTime();

  const dueAmount = obligations
    .filter((o) => o.status !== "settled" && new Date(o.dueDate).getTime() <= targetTime)
    .reduce((sum, o) => sum + o.amount, 0);

  const contributedAmount = contributions
    .filter((c) => new Date(c.date).getTime() <= targetTime)
    .reduce((sum, c) => sum + c.amount, 0);

  const available = currentBalance + contributedAmount;
  return Number(Math.max(0, dueAmount - available).toFixed(2));
}

/**
 * Evaluates threshold warnings (30, 14, 7 days before due date).
 * Critical (<= 7 days), Warning (<= 14 days), Info (<= 30 days).
 * Only generates a warning if there is a projected shortfall on that obligation's due date.
 */
export function evaluateThresholdWarnings(
  currentBalance: number,
  obligations: SettlementObligation[],
  contributions: ScheduledContribution[],
  now: number = Date.now()
): ReserveThresholdWarning[] {
  const warnings: ReserveThresholdWarning[] = [];

  for (const obligation of obligations) {
    if (obligation.status === "settled") continue;

    const daysRemaining = getDaysRemaining(obligation.dueDate, now);

    // If already overdue or more than 30 days out, skip 30/14/7 window warnings
    if (daysRemaining > 30) continue;

    const shortfall = calculateShortfallAtDate(
      obligation.dueDate,
      currentBalance,
      obligations,
      contributions
    );

    // If fully funded with no shortfall, no warning notification needed for this date
    if (shortfall <= 0) continue;

    let threshold: 30 | 14 | 7 = 30;
    let severity: WarningSeverity = "info";

    if (daysRemaining <= 7) {
      threshold = 7;
      severity = "critical";
    } else if (daysRemaining <= 14) {
      threshold = 14;
      severity = "warning";
    }

    const message =
      daysRemaining <= 0
        ? `Overdue: ${obligation.invoiceTitle} settlement is overdue by ${Math.abs(daysRemaining)} days!`
        : daysRemaining <= 7
        ? `Critical: ${obligation.invoiceTitle} settlement due in ${daysRemaining} days (Shortfall: ${shortfall.toLocaleString()} ${obligation.currency})`
        : daysRemaining <= 14
        ? `Urgent: ${obligation.invoiceTitle} settlement due in ${daysRemaining} days (Shortfall: ${shortfall.toLocaleString()} ${obligation.currency})`
        : `Notice: ${obligation.invoiceTitle} settlement due in ${daysRemaining} days (Shortfall: ${shortfall.toLocaleString()} ${obligation.currency})`;

    warnings.push({
      obligationId: obligation.id,
      invoiceId: obligation.invoiceId,
      invoiceTitle: obligation.invoiceTitle,
      dueDate: obligation.dueDate,
      daysRemaining,
      threshold,
      severity,
      requiredAmount: obligation.amount,
      projectedShortfall: shortfall,
      message,
    });
  }

  // Sort by urgency: highest shortfall / fewest days remaining first
  return warnings.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/**
 * Computes complete summary for the liquidity reserve target planner.
 */
export function calculateReservePlannerSummary(
  currentBalance: number,
  obligations: SettlementObligation[],
  contributions: ScheduledContribution[],
  now: number = Date.now(),
  currency: string = "USDC"
): ReservePlannerSummary {
  const safeBalance = Math.max(0, currentBalance);

  let totalUpcoming = 0;
  let overdueCount = 0;
  let overdueAmount = 0;

  for (const o of obligations) {
    if (o.status === "settled") continue;
    const days = getDaysRemaining(o.dueDate, now);
    if (days < 0 || o.status === "overdue") {
      overdueCount++;
      overdueAmount += o.amount;
    }
    totalUpcoming += o.amount;
  }

  const totalContributions = contributions.reduce((sum, c) => sum + c.amount, 0);
  const projectedEndingBalance = safeBalance + totalContributions - totalUpcoming;
  const overallShortfall = Math.max(0, totalUpcoming - (safeBalance + totalContributions));
  const targetMet = overallShortfall === 0;

  // Active warnings generated only if target is NOT fully met
  const activeWarnings = targetMet
    ? []
    : evaluateThresholdWarnings(safeBalance, obligations, contributions, now);

  return {
    currentBalance: safeBalance,
    totalUpcomingObligations: Number(totalUpcoming.toFixed(2)),
    totalScheduledContributions: Number(totalContributions.toFixed(2)),
    projectedEndingBalance: Number(projectedEndingBalance.toFixed(2)),
    overallShortfall: Number(overallShortfall.toFixed(2)),
    targetMet,
    activeWarnings,
    hasOverdueObligations: overdueCount > 0,
    overdueCount,
    overdueAmount: Number(overdueAmount.toFixed(2)),
    currency,
  };
}

/**
 * Add a new scheduled contribution.
 */
export function addScheduledContribution(
  contributions: ScheduledContribution[],
  newContribution: Omit<ScheduledContribution, "id">
): ScheduledContribution[] {
  const id = `contrib-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return [...contributions, { ...newContribution, id }].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

/**
 * Remove an existing scheduled contribution by ID.
 */
export function removeScheduledContribution(
  contributions: ScheduledContribution[],
  contributionId: string
): ScheduledContribution[] {
  return contributions.filter((c) => c.id !== contributionId);
}

/**
 * Exports reserve schedule and obligations to CSV matching dashboard figures.
 */
export function exportReservePlanToCsv(
  summary: ReservePlannerSummary,
  obligations: SettlementObligation[],
  contributions: ScheduledContribution[]
): string {
  const lines: string[] = [];

  // Summary section
  lines.push("RESERVE TARGET PLANNER REPORT");
  lines.push(`Currency,${summary.currency}`);
  lines.push(`Current Reserve Balance,${summary.currentBalance}`);
  lines.push(`Total Upcoming Obligations,${summary.totalUpcomingObligations}`);
  lines.push(`Total Scheduled Contributions,${summary.totalScheduledContributions}`);
  lines.push(`Projected Net Balance,${summary.projectedEndingBalance}`);
  lines.push(`Total Shortfall,${summary.overallShortfall}`);
  lines.push(`Target Met,${summary.targetMet ? "YES" : "NO"}`);
  lines.push("");

  // Obligations Table
  lines.push("UPCOMING SETTLEMENT OBLIGATIONS");
  lines.push("ID,Invoice ID,Title,Due Date,Amount,Status");
  for (const o of obligations) {
    lines.push(
      `"${o.id}","${o.invoiceId}","${o.invoiceTitle}","${o.dueDate}",${o.amount},"${o.status}"`
    );
  }
  lines.push("");

  // Contributions Table
  lines.push("SCHEDULED CONTRIBUTIONS");
  lines.push("ID,Date,Amount,Source Account,Description,Recurring");
  for (const c of contributions) {
    lines.push(
      `"${c.id}","${c.date}",${c.amount},"${c.sourceAccount}","${c.description || ""}","${c.recurring || "none"}"`
    );
  }

  return lines.join("\n");
}
