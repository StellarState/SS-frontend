/**
 * Compliance Review Queue Domain Logic (Issue #671 - P0)
 *
 * Implements high-assurance institutional compliance workflow:
 * - Role-gated queue access (compliance officers and admins)
 * - Timezone-independent SLA calculation and automatic escalation
 * - Mandatory decision rationale comments preventing accidental decisions
 * - Strictly append-only, immutable case audit history
 * - Immediate queue count reconciliation upon decision resolution
 */

export type ComplianceCategory = "KYC" | "AML" | "RESTRICTIONS";
export type RiskTier = "low" | "medium" | "high" | "critical";
export type ComplianceCaseStatus =
  | "pending_review"
  | "evidence_requested"
  | "approved"
  | "restricted";

export interface ComplianceEvidenceRecord {
  id: string;
  title: string;
  type: string;
  url: string;
  submittedAt: string;
  sha256: string;
}

export interface ComplianceHistoryEntry {
  id: string;
  timestamp: string;
  operator: string;
  action: "created" | "evidence_requested" | "approved" | "restricted";
  comment: string;
}

export interface ComplianceCase {
  id: string;
  entityId: string;
  entityName: string;
  category: ComplianceCategory;
  riskTier: RiskTier;
  assignedTo: string | null;
  createdAt: string; // ISO string
  slaDeadline: string; // ISO string
  status: ComplianceCaseStatus;
  flagReason: string;
  evidenceRecords: ComplianceEvidenceRecord[];
  history: readonly ComplianceHistoryEntry[]; // Immutable history
}

export interface ComplianceQueueFilters {
  category?: ComplianceCategory | "all";
  riskTier?: RiskTier | "all";
  assignee?: string | "all";
  status?: ComplianceCaseStatus | "all";
  search?: string;
}

export interface SlaStatus {
  isBreached: boolean;
  isEscalated: boolean;
  remainingMs: number;
  formattedText: string;
}

/**
 * Timezone-independent SLA calculation based on absolute epoch milliseconds.
 */
export function computeSlaStatus(deadlineIso: string, nowMs: number = Date.now()): SlaStatus {
  const deadlineMs = new Date(deadlineIso).getTime();
  const remainingMs = deadlineMs - nowMs;

  const isBreached = remainingMs <= 0;
  // Escalated if already breached or under 4 hours remaining
  const isEscalated = isBreached || remainingMs <= 4 * 60 * 60 * 1000;

  if (isBreached) {
    const overdueMs = Math.abs(remainingMs);
    const hours = Math.floor(overdueMs / (1000 * 60 * 60));
    const min = Math.floor((overdueMs % (1000 * 60 * 60)) / (1000 * 60));
    return {
      isBreached: true,
      isEscalated: true,
      remainingMs,
      formattedText: `SLA Breached by ${hours}h ${min}m`,
    };
  }

  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const min = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

  return {
    isBreached: false,
    isEscalated,
    remainingMs,
    formattedText: isEscalated ? `${hours}h ${min}m (Escalated)` : `${hours}h ${min}m remaining`,
  };
}

/**
 * Verifies if user has compliance or administrative authority to access queue.
 */
export function isAuthorisedForCompliance(token: string | null): boolean {
  if (!token) return false;
  try {
    const encoded = token.split(".")[1];
    if (!encoded) return false;
    const payload = JSON.parse(atob(encoded.replace(/-/g, "+").replace(/_/g, "/"))) as {
      role?: string;
    };
    return (
      payload.role === "admin" ||
      payload.role === "compliance" ||
      payload.role === "compliance_officer"
    );
  } catch {
    return false;
  }
}

/**
 * Filters compliance queue items by risk, category, assignee, status, and entity query.
 */
export function filterComplianceCases(
  cases: ComplianceCase[],
  filters: ComplianceQueueFilters
): ComplianceCase[] {
  return cases.filter((c) => {
    if (filters.category && filters.category !== "all" && c.category !== filters.category) {
      return false;
    }
    if (filters.riskTier && filters.riskTier !== "all" && c.riskTier !== filters.riskTier) {
      return false;
    }
    if (filters.status && filters.status !== "all" && c.status !== filters.status) {
      return false;
    }
    if (filters.assignee && filters.assignee !== "all") {
      if (filters.assignee === "unassigned") {
        if (c.assignedTo !== null) return false;
      } else if (c.assignedTo !== filters.assignee) {
        return false;
      }
    }
    if (filters.search && filters.search.trim() !== "") {
      const q = filters.search.toLowerCase().trim();
      const matchName = c.entityName.toLowerCase().includes(q);
      const matchId = c.id.toLowerCase().includes(q);
      if (!matchName && !matchId) return false;
    }
    return true;
  });
}

/**
 * Records an immutable compliance decision.
 * Strictly requires a non-empty comment to prevent accidental approvals or restrictions.
 */
export function recordComplianceDecision(
  caseItem: ComplianceCase,
  action: "approved" | "evidence_requested" | "restricted",
  operator: string,
  comment: string
): { success: boolean; error?: string; updatedCase?: ComplianceCase } {
  if (!operator || operator.trim() === "") {
    return { success: false, error: "Operator identification required." };
  }

  // Mandatory comments prevent accidental decisions
  if (!comment || comment.trim().length < 5) {
    return {
      success: false,
      error: "A substantive decision rationale comment (at least 5 characters) is required.",
    };
  }

  let nextStatus: ComplianceCaseStatus = caseItem.status;
  if (action === "approved") {
    nextStatus = "approved";
  } else if (action === "restricted") {
    nextStatus = "restricted";
  } else if (action === "evidence_requested") {
    nextStatus = "evidence_requested";
  }

  const newHistoryEntry: ComplianceHistoryEntry = {
    id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    operator: operator.trim(),
    action,
    comment: comment.trim(),
  };

  // Immutable history append
  const updatedHistory = Object.freeze([...caseItem.history, newHistoryEntry]);

  const updatedCase: ComplianceCase = {
    ...caseItem,
    status: nextStatus,
    history: updatedHistory,
  };

  return { success: true, updatedCase };
}

export const SAMPLE_COMPLIANCE_CASES: ComplianceCase[] = [
  {
    id: "case-comp-001",
    entityId: "ent-8812-meridian",
    entityName: "Meridian Trade Finance Corp",
    category: "KYC",
    riskTier: "critical",
    assignedTo: "officer.chen@stellarsettle.org",
    createdAt: "2026-11-21T08:00:00.000Z",
    slaDeadline: new Date(Date.now() + 2 * 3600 * 1000).toISOString(), // ~2h remaining (escalated)
    status: "pending_review",
    flagReason: "Ultimate Beneficial Owner (UBO) jurisdiction mismatch with corporate register.",
    evidenceRecords: [
      {
        id: "ev-01",
        title: "Delaware Certificate of Good Standing",
        type: "pdf",
        url: "https://compliance.stellarsettle.org/evidence/delaware-standing-2026.pdf",
        submittedAt: "2026-11-21T08:15:00.000Z",
        sha256: "0x3f78a2d1e0b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9",
      },
      {
        id: "ev-02",
        title: "UBO Passport & Proof of Address",
        type: "pdf",
        url: "https://compliance.stellarsettle.org/evidence/ubo-passport-verified.pdf",
        submittedAt: "2026-11-21T08:20:00.000Z",
        sha256: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      },
    ],
    history: Object.freeze([
      {
        id: "hist-01",
        timestamp: "2026-11-21T08:00:00.000Z",
        operator: "System Oracle",
        action: "created",
        comment: "Automated PEP and sanctions scan flagged secondary entity shareholder.",
      },
    ]),
  },
  {
    id: "case-comp-002",
    entityId: "ent-4491-vortex",
    entityName: "Vortex Commodities Group",
    category: "AML",
    riskTier: "high",
    assignedTo: null,
    createdAt: "2026-11-20T12:00:00.000Z",
    slaDeadline: new Date(Date.now() - 3 * 3600 * 1000).toISOString(), // 3h overdue (breached)
    status: "pending_review",
    flagReason: "Rapid invoice velocity exceeding 300% historical baseline in 24 hours.",
    evidenceRecords: [
      {
        id: "ev-03",
        title: "Bill of Lading & Port Manifest",
        type: "pdf",
        url: "https://compliance.stellarsettle.org/evidence/bol-manifest-rotterdam.pdf",
        submittedAt: "2026-11-20T12:30:00.000Z",
        sha256: "0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba",
      },
    ],
    history: Object.freeze([
      {
        id: "hist-02",
        timestamp: "2026-11-20T12:00:00.000Z",
        operator: "Velocity Monitor",
        action: "created",
        comment: "High volume settlement anomaly triggered institutional compliance hold.",
      },
    ]),
  },
  {
    id: "case-comp-003",
    entityId: "ent-3310-nordic",
    entityName: "Nordic Timber Logistics Oy",
    category: "RESTRICTIONS",
    riskTier: "medium",
    assignedTo: "officer.chen@stellarsettle.org",
    createdAt: "2026-11-22T06:00:00.000Z",
    slaDeadline: new Date(Date.now() + 18 * 3600 * 1000).toISOString(), // ~18h remaining
    status: "pending_review",
    flagReason: "Temporary operational payout cap applied pending updated corporate tax clearance.",
    evidenceRecords: [],
    history: Object.freeze([
      {
        id: "hist-03",
        timestamp: "2026-11-22T06:00:00.000Z",
        operator: "Tax Service Monitor",
        action: "created",
        comment: "Routine annual VAT clearance filing required.",
      },
    ]),
  },
];
