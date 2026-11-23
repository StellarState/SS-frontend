import { describe, expect, it, vi } from "vitest";
import {
  calculateDocumentExpiry,
  checkAndTriggerReminders,
  renewDocumentRecord,
  canInvoiceAcceptFunding,
  type DocumentExpiryMetadata,
} from "@/lib/invoiceDocumentExpiry";

describe("invoice document expiry & renewal (#658)", () => {
  const baseDate = new Date("2026-06-01T12:00:00Z");

  it("calculates active state when expiry is more than 30 days away", () => {
    const futureExpiry = new Date("2026-08-01T12:00:00Z").toISOString();
    const result = calculateDocumentExpiry(
      { expiresAt: futureExpiry, isMandatory: true, gracePeriodDays: 7 },
      baseDate,
    );

    expect(result.status).toBe("active");
    expect(result.isExpired).toBe(false);
    expect(result.isInGracePeriod).toBe(false);
    expect(result.canFund).toBe(true);
    expect(result.activeReminderThreshold).toBeNull();
  });

  it("triggers 30-day notice when document expires in 25 days", () => {
    const expiry = new Date("2026-06-26T12:00:00Z").toISOString();
    const result = calculateDocumentExpiry({ expiresAt: expiry }, baseDate);

    expect(result.status).toBe("expiring_soon");
    expect(result.activeReminderThreshold).toBe("30_days");
    expect(result.canFund).toBe(true);
  });

  it("triggers 14-day reminder when document expires in 10 days", () => {
    const expiry = new Date("2026-06-11T12:00:00Z").toISOString();
    const result = calculateDocumentExpiry({ expiresAt: expiry }, baseDate);

    expect(result.status).toBe("expiring_soon");
    expect(result.activeReminderThreshold).toBe("14_days");
    expect(result.canFund).toBe(true);
  });

  it("triggers 3-day urgent reminder when document expires in 2 days", () => {
    const expiry = new Date("2026-06-03T12:00:00Z").toISOString();
    const result = calculateDocumentExpiry({ expiresAt: expiry }, baseDate);

    expect(result.status).toBe("expiring_soon");
    expect(result.activeReminderThreshold).toBe("3_days");
    expect(result.canFund).toBe(true);
  });

  it("enters grace period and blocks funding for mandatory documents", () => {
    // 3 days past expiry, within 7-day grace period
    const expiredDate = new Date("2026-05-29T12:00:00Z").toISOString();
    const result = calculateDocumentExpiry(
      { expiresAt: expiredDate, isMandatory: true, gracePeriodDays: 7 },
      baseDate,
    );

    expect(result.status).toBe("in_grace_period");
    expect(result.isExpired).toBe(true);
    expect(result.isInGracePeriod).toBe(true);
    expect(result.canFund).toBe(false); // Mandatory document blocks funding!
    expect(result.explanation).toContain("Grace period active");
    expect(result.explanation).toContain("Funding is paused");
  });

  it("allows funding in grace period for non-mandatory documents", () => {
    const expiredDate = new Date("2026-05-29T12:00:00Z").toISOString();
    const result = calculateDocumentExpiry(
      { expiresAt: expiredDate, isMandatory: false, gracePeriodDays: 7 },
      baseDate,
    );

    expect(result.status).toBe("in_grace_period");
    expect(result.canFund).toBe(true);
  });

  it("enters expired status when grace period ends and blocks funding", () => {
    // 10 days past expiry, grace period is 7 days
    const pastGrace = new Date("2026-05-22T12:00:00Z").toISOString();
    const result = calculateDocumentExpiry(
      { expiresAt: pastGrace, isMandatory: true, gracePeriodDays: 7 },
      baseDate,
    );

    expect(result.status).toBe("expired");
    expect(result.isInGracePeriod).toBe(false);
    expect(result.canFund).toBe(false);
  });

  it("fires reminders without duplication and appends to audit history", () => {
    const docMeta: DocumentExpiryMetadata = {
      id: "doc-1",
      invoiceId: "inv-100",
      documentUrl: "ipfs://bafy1",
      name: "Invoice Agreement",
      isMandatory: true,
      expiresAt: new Date("2026-06-11T12:00:00Z").toISOString(), // 10 days away
      gracePeriodDays: 7,
      remindersSent: [],
      auditHistory: [],
    };

    const reminderSpy = vi.fn();
    const updated = checkAndTriggerReminders(docMeta, baseDate, reminderSpy);

    expect(reminderSpy).toHaveBeenCalledWith("14_days", expect.any(Object));
    expect(updated.remindersSent).toContain("14_days");
    expect(updated.auditHistory).toHaveLength(1);
    expect(updated.auditHistory[0].action).toBe("reminder_sent");

    // Second check should not duplicate
    const secondCheck = checkAndTriggerReminders(updated, baseDate, reminderSpy);
    expect(reminderSpy).toHaveBeenCalledTimes(1);
    expect(secondCheck.auditHistory).toHaveLength(1);
  });

  it("preserves prior audit history upon document renewal", () => {
    const docMeta: DocumentExpiryMetadata = {
      id: "doc-1",
      invoiceId: "inv-100",
      documentUrl: "ipfs://bafy-old",
      name: "Bill of Lading",
      isMandatory: true,
      expiresAt: new Date("2026-05-20T12:00:00Z").toISOString(),
      gracePeriodDays: 7,
      remindersSent: ["30_days", "14_days", "expired"],
      auditHistory: [
        {
          id: "audit-1",
          action: "uploaded",
          timestamp: "2026-01-01T00:00:00Z",
          actor: "issuer_initial",
        },
        {
          id: "audit-2",
          action: "reminder_sent",
          timestamp: "2026-05-01T00:00:00Z",
          actor: "system_scheduler",
        },
      ],
    };

    const newExpiry = new Date("2027-05-20T12:00:00Z").toISOString();
    const renewed = renewDocumentRecord(
      docMeta,
      "ipfs://bafy-new",
      newExpiry,
      "issuer_wallet_xyz",
      "Re-certified by customs authority",
      baseDate,
    );

    expect(renewed.documentUrl).toBe("ipfs://bafy-new");
    expect(renewed.expiresAt).toBe(newExpiry);
    expect(renewed.status).toBe("renewed");
    expect(renewed.remindersSent).toEqual([]); // Reset for new cycle
    expect(renewed.auditHistory).toHaveLength(3); // Preserved previous 2 + 1 new!
    expect(renewed.auditHistory[2].action).toBe("renewed");
    expect(renewed.auditHistory[2].previousDocumentUrl).toBe("ipfs://bafy-old");
    expect(renewed.auditHistory[2].newDocumentUrl).toBe("ipfs://bafy-new");
    expect(renewed.auditHistory[2].actor).toBe("issuer_wallet_xyz");
  });

  it("canInvoiceAcceptFunding checks all documents and blocks on expired mandatory", () => {
    const validDoc: DocumentExpiryMetadata = {
      id: "doc-1",
      invoiceId: "inv-100",
      documentUrl: "ipfs://valid",
      name: "Valid Agreement",
      isMandatory: true,
      expiresAt: new Date("2026-09-01T00:00:00Z").toISOString(),
      gracePeriodDays: 7,
      remindersSent: [],
      auditHistory: [],
    };

    const expiredMandatoryDoc: DocumentExpiryMetadata = {
      id: "doc-2",
      invoiceId: "inv-100",
      documentUrl: "ipfs://expired-mandatory",
      name: "Tax Clearance",
      isMandatory: true,
      expiresAt: new Date("2026-05-15T00:00:00Z").toISOString(),
      gracePeriodDays: 7,
      remindersSent: [],
      auditHistory: [],
    };

    const check1 = canInvoiceAcceptFunding([validDoc], baseDate);
    expect(check1.canFund).toBe(true);

    const check2 = canInvoiceAcceptFunding([validDoc, expiredMandatoryDoc], baseDate);
    expect(check2.canFund).toBe(false);
    expect(check2.blockingReasons).toHaveLength(1);
    expect(check2.blockingReasons[0]).toContain("Tax Clearance");
  });
});
