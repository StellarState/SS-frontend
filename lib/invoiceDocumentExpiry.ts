/**
 * Invoice Document Renewal and Expiry Alerts (#658)
 *
 * Tracks document expiry dates, sends alert reminders (30, 14, 3 days),
 * manages configured grace periods, preserves audit history during renewal,
 * and blocks funding for invoices with expired mandatory documents.
 */

export type DocumentExpiryStatus =
  | "active"
  | "expiring_soon"
  | "in_grace_period"
  | "expired"
  | "renewed";

export type ExpiryReminderThreshold = "30_days" | "14_days" | "3_days" | "expired";

export interface DocumentAuditRecord {
  id: string;
  action: "uploaded" | "reminder_sent" | "renewed" | "grace_period_entered" | "expired";
  timestamp: string;
  actor: string;
  notes?: string;
  previousDocumentUrl?: string;
  newDocumentUrl?: string;
  previousExpiresAt?: string;
  newExpiresAt?: string;
}

export interface DocumentExpiryMetadata {
  id: string;
  invoiceId: string;
  documentUrl: string;
  name: string;
  isMandatory: boolean;
  expiresAt: string; // ISO date string
  gracePeriodDays: number;
  remindersSent: ExpiryReminderThreshold[];
  auditHistory: DocumentAuditRecord[];
  status?: DocumentExpiryStatus;
}

export const DEFAULT_GRACE_PERIOD_DAYS = 7;

export interface ExpiryCalculationResult {
  status: DocumentExpiryStatus;
  daysUntilExpiry: number;
  isExpired: boolean;
  isInGracePeriod: boolean;
  canFund: boolean;
  activeReminderThreshold: ExpiryReminderThreshold | null;
  explanation: string;
}

/**
 * Computes status, remaining days, grace-period state, and whether funding is allowed.
 */
export function calculateDocumentExpiry(
  meta: {
    expiresAt: string | Date;
    gracePeriodDays?: number;
    isMandatory?: boolean;
  },
  now: Date = new Date(),
): ExpiryCalculationResult {
  const expiryDate = new Date(meta.expiresAt);
  const graceDays = meta.gracePeriodDays ?? DEFAULT_GRACE_PERIOD_DAYS;
  const isMandatory = meta.isMandatory ?? true;

  const diffMs = expiryDate.getTime() - now.getTime();
  const daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry > 30) {
    return {
      status: "active",
      daysUntilExpiry,
      isExpired: false,
      isInGracePeriod: false,
      canFund: true,
      activeReminderThreshold: null,
      explanation: `Document valid for another ${daysUntilExpiry} days.`,
    };
  }

  if (daysUntilExpiry > 14) {
    return {
      status: "expiring_soon",
      daysUntilExpiry,
      isExpired: false,
      isInGracePeriod: false,
      canFund: true,
      activeReminderThreshold: "30_days",
      explanation: `Document expires in ${daysUntilExpiry} days (30-day notice).`,
    };
  }

  if (daysUntilExpiry > 3) {
    return {
      status: "expiring_soon",
      daysUntilExpiry,
      isExpired: false,
      isInGracePeriod: false,
      canFund: true,
      activeReminderThreshold: "14_days",
      explanation: `Document expires in ${daysUntilExpiry} days (14-day reminder). Renewal recommended.`,
    };
  }

  if (daysUntilExpiry > 0) {
    return {
      status: "expiring_soon",
      daysUntilExpiry,
      isExpired: false,
      isInGracePeriod: false,
      canFund: true,
      activeReminderThreshold: "3_days",
      explanation: `Urgent: document expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"}. Renew immediately to prevent funding pause.`,
    };
  }

  // Days <= 0 (expired)
  const daysPastExpiry = Math.abs(daysUntilExpiry);
  const isInGracePeriod = daysPastExpiry <= graceDays;

  if (isInGracePeriod) {
    const daysRemainingInGrace = graceDays - daysPastExpiry;
    return {
      status: "in_grace_period",
      daysUntilExpiry,
      isExpired: true,
      isInGracePeriod: true,
      canFund: !isMandatory, // Mandatory docs block funding during grace period
      activeReminderThreshold: "expired",
      explanation: isMandatory
        ? `Mandatory document expired ${daysPastExpiry} day(s) ago. Grace period active (${daysRemainingInGrace} days remaining). Funding is paused until a valid renewed document is submitted.`
        : `Document expired ${daysPastExpiry} day(s) ago. In grace period (${daysRemainingInGrace} days remaining).`,
    };
  }

  return {
    status: "expired",
    daysUntilExpiry,
    isExpired: true,
    isInGracePeriod: false,
    canFund: !isMandatory,
    activeReminderThreshold: "expired",
    explanation: isMandatory
      ? "Mandatory document has expired and grace period ended. Funding is blocked until renewed."
      : "Supporting document has expired.",
  };
}

/**
 * Checks if a reminder threshold should fire and records it in remindersSent and audit history.
 */
export function checkAndTriggerReminders(
  meta: DocumentExpiryMetadata,
  now: Date = new Date(),
  onReminder?: (threshold: ExpiryReminderThreshold, meta: DocumentExpiryMetadata) => void,
): DocumentExpiryMetadata {
  const { activeReminderThreshold, explanation } = calculateDocumentExpiry(meta, now);
  if (!activeReminderThreshold || meta.remindersSent.includes(activeReminderThreshold)) {
    return meta;
  }

  const newRecord: DocumentAuditRecord = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    action: "reminder_sent",
    timestamp: now.toISOString(),
    actor: "system_scheduler",
    notes: `Triggered ${activeReminderThreshold} alert: ${explanation}`,
  };

  const updated: DocumentExpiryMetadata = {
    ...meta,
    remindersSent: [...meta.remindersSent, activeReminderThreshold],
    auditHistory: [...meta.auditHistory, newRecord],
  };

  if (onReminder) {
    onReminder(activeReminderThreshold, updated);
  }

  return updated;
}

/**
 * Creates a renewal record, preserving 100% of the previous audit history.
 */
export function renewDocumentRecord(
  meta: DocumentExpiryMetadata,
  newDocumentUrl: string,
  newExpiresAt: string,
  actor: string,
  notes?: string,
  now: Date = new Date(),
): DocumentExpiryMetadata {
  const auditEntry: DocumentAuditRecord = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    action: "renewed",
    timestamp: now.toISOString(),
    actor,
    previousDocumentUrl: meta.documentUrl,
    newDocumentUrl,
    previousExpiresAt: meta.expiresAt,
    newExpiresAt,
    notes: notes ?? "Document renewed with updated expiry and verified CID.",
  };

  return {
    ...meta,
    documentUrl: newDocumentUrl,
    expiresAt: newExpiresAt,
    status: "renewed",
    remindersSent: [], // Reset reminder thresholds for the new expiry cycle
    auditHistory: [...meta.auditHistory, auditEntry],
  };
}

/**
 * Checks if any mandatory documents for an invoice are expired or in grace period, blocking funding.
 */
export function canInvoiceAcceptFunding(documents: DocumentExpiryMetadata[], now = new Date()): {
  canFund: boolean;
  blockingReasons: string[];
} {
  const blockingReasons: string[] = [];

  for (const doc of documents) {
    if (doc.isMandatory) {
      const { canFund, explanation } = calculateDocumentExpiry(doc, now);
      if (!canFund) {
        blockingReasons.push(`${doc.name || "Document"}: ${explanation}`);
      }
    }
  }

  return {
    canFund: blockingReasons.length === 0,
    blockingReasons,
  };
}

// ─── Storage Persistence (Memory / LocalStorage) ───────────────────────────

const STORAGE_PREFIX = "ss_doc_expiry_";

export function loadDocumentMetadata(invoiceId: string, documentUrl: string): DocumentExpiryMetadata | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${invoiceId}_${encodeURIComponent(documentUrl)}`);
    return raw ? (JSON.parse(raw) as DocumentExpiryMetadata) : null;
  } catch {
    return null;
  }
}

export function saveDocumentMetadata(meta: DocumentExpiryMetadata): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      `${STORAGE_PREFIX}${meta.invoiceId}_${encodeURIComponent(meta.documentUrl)}`,
      JSON.stringify(meta),
    );
  } catch {
    // Gracefully handle storage quotas / privacy modes
  }
}
