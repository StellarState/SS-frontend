import {
  sanitizePublicDebtorProfile,
  toggleWatchedDebtor,
  isDebtorWatched,
  calculateConcentrationPercentage,
  type RawDebtorRecord,
} from "@/lib/debtor/organisationDirectory";

describe("Debtor Organisation Directory Engine (Issue #665)", () => {
  const mockRawRecord: RawDebtorRecord = {
    id: "org-test-1",
    name: "Pacific Rim Logistics",
    jurisdiction: "Japan",
    creditRating: "AA",
    status: "Trusted",
    taxId: "JP-SECRET-999", // Sensitive - should be stripped
    bankAccountIban: "JP990011223344", // Sensitive - should be stripped
    privateOfficerEmail: "cfo@pacificrim.jp", // Sensitive - should be stripped
    internalRiskScore: 94, // Sensitive - should be stripped
    approvedAttestations: ["JETRO Registry"],
    publicDocuments: [{ id: "doc-1", title: "Certificate of Standing", verifiedAt: "2026-01-01" }],
    invoices: [
      { id: "inv-1", invoiceNumber: "INV-101", amountXLM: 50_000, status: "settled", dueDate: "2026-08-01" },
      { id: "inv-2", invoiceNumber: "INV-102", amountXLM: 25_000, status: "active", dueDate: "2026-12-01" },
    ],
  };

  it("sanitizes public debtor profile, stripping sensitive PII and bank credentials", () => {
    const sanitized = sanitizePublicDebtorProfile(mockRawRecord);

    expect(sanitized.id).toBe("org-test-1");
    expect(sanitized.name).toBe("Pacific Rim Logistics");
    expect(sanitized.jurisdiction).toBe("Japan");
    expect(sanitized.creditRating).toBe("AA");
    expect(sanitized.status).toBe("Trusted");

    // Ensure sensitive fields do NOT exist on the public object
    const rawObj = sanitized as any;
    expect(rawObj.taxId).toBeUndefined();
    expect(rawObj.bankAccountIban).toBeUndefined();
    expect(rawObj.privateOfficerEmail).toBeUndefined();
    expect(rawObj.internalRiskScore).toBeUndefined();
  });

  it("correctly computes exposure and settlement volume metrics", () => {
    const sanitized = sanitizePublicDebtorProfile(mockRawRecord);

    expect(sanitized.totalInvoicesCount).toBe(2);
    expect(sanitized.settledInvoicesCount).toBe(1);
    expect(sanitized.settledVolumeXLM).toBe(50_000);
    expect(sanitized.activeObligationsXLM).toBe(25_000);
    expect(sanitized.defaultRatePercent).toBe(0);
  });

  it("handles empty or default fields gracefully", () => {
    const minimal: RawDebtorRecord = {
      id: "org-empty",
      name: "Acme Corp",
      jurisdiction: "",
    };
    const sanitized = sanitizePublicDebtorProfile(minimal);

    expect(sanitized.jurisdiction).toBe("Global");
    expect(sanitized.creditRating).toBe("Unrated");
    expect(sanitized.status).toBe("Neutral");
    expect(sanitized.totalExposureXLM).toBe(0);
    expect(sanitized.settledVolumeXLM).toBe(0);
  });

  it("toggles watched debtors list without mutating original array", () => {
    const initial = ["org-1", "org-2"];
    const added = toggleWatchedDebtor(initial, "org-3");
    expect(added).toEqual(["org-1", "org-2", "org-3"]);

    const removed = toggleWatchedDebtor(added, "org-2");
    expect(removed).toEqual(["org-1", "org-3"]);
    expect(isDebtorWatched(removed, "org-1")).toBe(true);
    expect(isDebtorWatched(removed, "org-2")).toBe(false);
  });

  it("calculates portfolio concentration correctly", () => {
    expect(calculateConcentrationPercentage(25_000, 100_000)).toBe(25);
    expect(calculateConcentrationPercentage(10_000, 0)).toBe(0);
    expect(calculateConcentrationPercentage(150_000, 100_000)).toBe(100);
  });
});
