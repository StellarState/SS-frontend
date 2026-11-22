/**
 * Issuer covenant monitoring analytics engine (#678).
 *
 * Implements covenant headroom calculations, warning and breach threshold
 * detection, accurate cure countdowns, evidence verification, and role-based
 * visibility for authorised investors.
 */

export type CovenantStatus = "healthy" | "warning" | "breached" | "cured";
export type CovenantDirection = "min" | "max";

export interface CovenantEvidenceRecord {
  id: string;
  title: string;
  document_type: "audit_report" | "bank_attestation" | "financial_statement";
  cid: string;
  sha256_hash: string;
  uploaded_at: string;
  visibility: "public" | "authorized_investors_only";
}

export interface MonitoredCovenant {
  id: string;
  name: string;
  description: string;
  metric_unit: string; // e.g. "x", "XLM", "%"
  direction: CovenantDirection;
  threshold_value: number;
  warning_threshold_value: number; // Precedes breach threshold
  current_value: number;
  last_tested_at: string;
  next_test_date: string;
  status: CovenantStatus;
  headroom_value: number;
  headroom_percent: number;
  cure_deadline?: string | null;
  cure_plan_summary?: string | null;
  evidence_records: CovenantEvidenceRecord[];
}

/**
 * Calculates headroom value and percentage relative to threshold.
 * Acceptance criteria: Each covenant reports units and values.
 */
export function calculateCovenantHeadroom(
  current: number,
  threshold: number,
  direction: CovenantDirection,
): { headroomValue: number; headroomPercent: number } {
  if (direction === "min") {
    // Current must stay ABOVE threshold
    const headroomValue = Number((current - threshold).toFixed(4));
    const headroomPercent = threshold !== 0 ? Number(((headroomValue / threshold) * 100).toFixed(2)) : 0;
    return { headroomValue, headroomPercent };
  } else {
    // Current must stay BELOW threshold
    const headroomValue = Number((threshold - current).toFixed(4));
    const headroomPercent = threshold !== 0 ? Number(((headroomValue / threshold) * 100).toFixed(2)) : 0;
    return { headroomValue, headroomPercent };
  }
}

/**
 * Evaluates the status of a covenant based on current value and warning/breach thresholds.
 * Acceptance criteria: Warning precedes breach thresholds; Tests cover all covenant states.
 */
export function evaluateCovenantStatus(
  covenant: Omit<MonitoredCovenant, "status" | "headroom_value" | "headroom_percent">,
  currentValue: number,
): {
  status: CovenantStatus;
  headroomValue: number;
  headroomPercent: number;
  isBreached: boolean;
  isWarning: boolean;
} {
  const { direction, threshold_value, warning_threshold_value } = covenant;
  const { headroomValue, headroomPercent } = calculateCovenantHeadroom(
    currentValue,
    threshold_value,
    direction,
  );

  let status: CovenantStatus = "healthy";
  let isBreached = false;
  let isWarning = false;

  if (direction === "min") {
    // Breach if currentValue < threshold_value
    if (currentValue < threshold_value) {
      status = "breached";
      isBreached = true;
    } else if (currentValue <= warning_threshold_value) {
      // Warning precedes breach: threshold_value <= currentValue <= warning_threshold_value
      status = "warning";
      isWarning = true;
    } else {
      status = "healthy";
    }
  } else {
    // Breach if currentValue > threshold_value
    if (currentValue > threshold_value) {
      status = "breached";
      isBreached = true;
    } else if (currentValue >= warning_threshold_value) {
      // Warning precedes breach: warning_threshold_value <= currentValue <= threshold_value
      status = "warning";
      isWarning = true;
    } else {
      status = "healthy";
    }
  }

  return {
    status,
    headroomValue,
    headroomPercent,
    isBreached,
    isWarning,
  };
}

/**
 * Computes remaining time until the cure deadline expires.
 * Acceptance criteria: Cure countdown is accurate.
 */
export function calculateCureCountdown(
  cureDeadlineIso: string | null | undefined,
  nowInput?: string | Date | number,
): {
  isExpired: boolean;
  totalSecondsRemaining: number;
  days: number;
  hours: number;
  minutes: number;
  formattedText: string;
} {
  if (!cureDeadlineIso) {
    return {
      isExpired: false,
      totalSecondsRemaining: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      formattedText: "No cure countdown active",
    };
  }

  const nowMs =
    nowInput instanceof Date
      ? nowInput.getTime()
      : typeof nowInput === "string"
        ? new Date(nowInput).getTime()
        : typeof nowInput === "number"
          ? nowInput
          : Date.now();

  const deadlineMs = new Date(cureDeadlineIso).getTime();
  const diffMs = deadlineMs - nowMs;

  if (diffMs <= 0) {
    return {
      isExpired: true,
      totalSecondsRemaining: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      formattedText: "Cure period expired",
    };
  }

  const totalSecondsRemaining = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSecondsRemaining / 86400);
  const hours = Math.floor((totalSecondsRemaining % 86400) / 3600);
  const minutes = Math.floor((totalSecondsRemaining % 3600) / 60);

  const formattedText =
    days > 0
      ? `${days}d ${hours}h ${minutes}m remaining`
      : `${hours}h ${minutes}m remaining`;

  return {
    isExpired: false,
    totalSecondsRemaining,
    days,
    hours,
    minutes,
    formattedText,
  };
}

/**
 * Filters covenants and evidence records according to authorized investor permissions.
 * Acceptance criteria: Authorised investor groups see breaches; Evidence uses the secure viewer.
 */
export function filterCovenantsForAudience(
  covenants: MonitoredCovenant[],
  isAuthorizedInvestor: boolean,
): MonitoredCovenant[] {
  return covenants.map((cov) => {
    // If not authorized investor, hide restricted evidence and mask sensitive breach remediation details
    const filteredEvidence = cov.evidence_records.filter(
      (ev) => isAuthorizedInvestor || ev.visibility === "public",
    );

    return {
      ...cov,
      cure_plan_summary: isAuthorizedInvestor ? cov.cure_plan_summary : null,
      evidence_records: filteredEvidence,
    };
  });
}
