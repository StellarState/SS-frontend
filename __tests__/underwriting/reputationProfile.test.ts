import {
  calculateReputation,
  reconcileCapacity,
  sanitizeUnderwriterProfile,
  toggleFollowUnderwriter,
  getFollowedUnderwriters,
  isUnderwriterFollowed,
  getUnderwriterTier,
  sortSlashingHistory,
  UNDERWRITER_FOLLOW_STORAGE_KEY,
  type InvoiceHistoryRecord,
  type SlashingEvent,
} from "@/lib/underwriting/reputationProfile";

describe("Underwriter Reputation Calculation", () => {
  it("returns null score and full uncertainty range when history is empty", () => {
    const result = calculateReputation([]);
    expect(result.score).toBeNull();
    expect(result.sampleCount).toBe(0);
    expect(result.settledCount).toBe(0);
    expect(result.defaultedCount).toBe(0);
    expect(result.activeCount).toBe(0);
    expect(result.confidenceRange).toEqual({ min: 0, max: 100 });
  });

  it("handles undefined or null history gracefully", () => {
    const resultUndefined = calculateReputation(undefined);
    expect(resultUndefined.score).toBeNull();
    expect(resultUndefined.sampleCount).toBe(0);

    const resultNull = calculateReputation(null as unknown as InvoiceHistoryRecord[]);
    expect(resultNull.score).toBeNull();
    expect(resultNull.sampleCount).toBe(0);
  });

  it("calculates 100 score for 100% settled invoices", () => {
    const history: InvoiceHistoryRecord[] = [
      { id: "1", invoiceId: "INV-1", amount: 10000, status: "settled" },
      { id: "2", invoiceId: "INV-2", amount: 25000, status: "settled" },
      { id: "3", invoiceId: "INV-3", amount: 50000, status: "settled" },
    ];
    const result = calculateReputation(history);
    expect(result.score).toBe(100);
    expect(result.sampleCount).toBe(3);
    expect(result.settledCount).toBe(3);
    expect(result.defaultedCount).toBe(0);
    expect(result.confidenceRange.max).toBe(100);
    expect(result.confidenceRange.min).toBeGreaterThan(0);
  });

  it("calculates 0 score for 100% defaulted invoices", () => {
    const history: InvoiceHistoryRecord[] = [
      { id: "1", invoiceId: "INV-1", amount: 10000, status: "defaulted" },
      { id: "2", invoiceId: "INV-2", amount: 20000, status: "defaulted" },
    ];
    const result = calculateReputation(history);
    expect(result.score).toBe(0);
    expect(result.sampleCount).toBe(2);
    expect(result.settledCount).toBe(0);
    expect(result.defaultedCount).toBe(2);
    expect(result.confidenceRange.min).toBe(0);
    expect(result.confidenceRange.max).toBeLessThan(100);
  });

  it("calculates proportional score for mixed settled and defaulted invoices", () => {
    const history: InvoiceHistoryRecord[] = [
      { id: "1", invoiceId: "INV-1", amount: 10000, status: "settled" },
      { id: "2", invoiceId: "INV-2", amount: 10000, status: "settled" },
      { id: "3", invoiceId: "INV-3", amount: 10000, status: "settled" },
      { id: "4", invoiceId: "INV-4", amount: 10000, status: "defaulted" },
    ];
    // 3 out of 4 settled = 75%
    const result = calculateReputation(history);
    expect(result.score).toBe(75);
    expect(result.sampleCount).toBe(4);
    expect(result.settledCount).toBe(3);
    expect(result.defaultedCount).toBe(1);
    expect(result.confidenceRange.min).toBeLessThan(75);
    expect(result.confidenceRange.max).toBeGreaterThan(75);
  });

  it("does not count active invoices in sample count but records activeCount", () => {
    const history: InvoiceHistoryRecord[] = [
      { id: "1", invoiceId: "INV-1", amount: 10000, status: "settled" },
      { id: "2", invoiceId: "INV-2", amount: 15000, status: "active" },
      { id: "3", invoiceId: "INV-3", amount: 20000, status: "active" },
    ];
    const result = calculateReputation(history);
    expect(result.sampleCount).toBe(1);
    expect(result.settledCount).toBe(1);
    expect(result.defaultedCount).toBe(0);
    expect(result.activeCount).toBe(2);
    expect(result.score).toBe(100);
  });

  it("produces narrower confidence intervals as sample size increases", () => {
    // 1 sample (100% settled)
    const smallSample: InvoiceHistoryRecord[] = [
      { id: "1", invoiceId: "INV-1", amount: 10000, status: "settled" },
    ];
    const smallRes = calculateReputation(smallSample);
    const smallSpread = smallRes.confidenceRange.max - smallRes.confidenceRange.min;

    // 50 samples (100% settled)
    const largeSample: InvoiceHistoryRecord[] = Array.from({ length: 50 }, (_, i) => ({
      id: String(i),
      invoiceId: `INV-${i}`,
      amount: 10000,
      status: "settled" as const,
    }));
    const largeRes = calculateReputation(largeSample);
    const largeSpread = largeRes.confidenceRange.max - largeRes.confidenceRange.min;

    expect(largeSpread).toBeLessThan(smallSpread);
    expect(largeRes.confidenceRange.min).toBeGreaterThan(smallRes.confidenceRange.min);
  });
});

describe("Capacity Reconciliation", () => {
  it("reconciles active and reserved cover under normal capacity", () => {
    const result = reconcileCapacity(1_000_000, 400_000, 100_000);
    expect(result.totalCapacity).toBe(1_000_000);
    expect(result.activeCover).toBe(400_000);
    expect(result.reservedCover).toBe(100_000);
    expect(result.availableCapacity).toBe(500_000);
    expect(result.utilizationRate).toBe(50);
    expect(result.isExhausted).toBe(false);
    expect(result.isOverallocated).toBe(false);
  });

  it("detects exhausted capacity when active + reserved equals total capacity", () => {
    const result = reconcileCapacity(500_000, 350_000, 150_000);
    expect(result.availableCapacity).toBe(0);
    expect(result.utilizationRate).toBe(100);
    expect(result.isExhausted).toBe(true);
    expect(result.isOverallocated).toBe(false);
  });

  it("detects overallocated capacity when committed cover exceeds total capacity", () => {
    const result = reconcileCapacity(500_000, 400_000, 200_000);
    expect(result.availableCapacity).toBe(0);
    expect(result.utilizationRate).toBe(120);
    expect(result.isExhausted).toBe(true);
    expect(result.isOverallocated).toBe(true);
  });

  it("handles zero total capacity safely", () => {
    const resultZero = reconcileCapacity(0, 0, 0);
    expect(resultZero.totalCapacity).toBe(0);
    expect(resultZero.availableCapacity).toBe(0);
    expect(resultZero.utilizationRate).toBe(0);
    expect(resultZero.isExhausted).toBe(true);
    expect(resultZero.isOverallocated).toBe(false);

    const resultZeroWithCover = reconcileCapacity(0, 50000, 0);
    expect(resultZeroWithCover.isExhausted).toBe(true);
    expect(resultZeroWithCover.isOverallocated).toBe(true);
    expect(resultZeroWithCover.utilizationRate).toBe(100);
  });

  it("handles negative inputs gracefully by clamping to zero", () => {
    const result = reconcileCapacity(-100_000, -50_000, -20_000);
    expect(result.totalCapacity).toBe(0);
    expect(result.activeCover).toBe(0);
    expect(result.reservedCover).toBe(0);
    expect(result.availableCapacity).toBe(0);
    expect(result.isExhausted).toBe(true);
    expect(result.isOverallocated).toBe(false);
  });
});

describe("Privacy Sanitation", () => {
  it("strips private keys, seeds, mnemonics, and private memos", () => {
    const dirtyProfile = {
      id: "uw-clean-id",
      name: "Shield Underwriting",
      address: "GBV5S74OIWYREQGBNXORIC2D4Y66YMOUQPVIXBHKFPF637GKJKENZBYV",
      secretKey: "SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      privateKey: "0x123456789abcdef",
      seed: "correct horse battery staple",
      mnemonic: "abandon abandon abandon",
      privateMemo: "Confidential internal credit notes",
      memo_private: "Private debtor balance info",
      internalNotes: "Auditor warning flags",
      apiKey: "sk_live_123456",
      totalCapacity: 100_000,
      activeCover: 20_000,
      reservedCover: 10_000,
    };

    const sanitized = sanitizeUnderwriterProfile(dirtyProfile);

    expect(sanitized.id).toBe("uw-clean-id");
    expect(sanitized.name).toBe("Shield Underwriting");
    expect(sanitized.address).toBe("GBV5S74OIWYREQGBNXORIC2D4Y66YMOUQPVIXBHKFPF637GKJKENZBYV");

    // Ensure none of the private fields exist on sanitized output
    expect("secretKey" in sanitized).toBe(false);
    expect("privateKey" in sanitized).toBe(false);
    expect("seed" in sanitized).toBe(false);
    expect("mnemonic" in sanitized).toBe(false);
    expect("privateMemo" in sanitized).toBe(false);
    expect("memo_private" in sanitized).toBe(false);
    expect("internalNotes" in sanitized).toBe(false);
    expect("apiKey" in sanitized).toBe(false);
  });

  it("redacts secret seed address if mistakenly supplied as public address", () => {
    const leakedSeedProfile = {
      id: "uw-leaked",
      name: "Insecure Underwriter",
      address: "SB5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN", // Stellar secret seed
    };

    const sanitized = sanitizeUnderwriterProfile(leakedSeedProfile);
    expect(sanitized.address).not.toContain("SB5ZSEJYB37JRC5");
    expect(sanitized.address).toContain("REDACTED");
  });

  it("handles null or primitive inputs safely", () => {
    const sanitizedNull = sanitizeUnderwriterProfile(null);
    expect(sanitizedNull.id).toBe("unknown");
    expect(sanitizedNull.name).toBe("Anonymous Underwriter");
    expect(sanitizedNull.totalCapacity).toBe(0);

    const sanitizedStr = sanitizeUnderwriterProfile("bad-input");
    expect(sanitizedStr.id).toBe("unknown");
  });

  it("falls back to truncated address if name is blank", () => {
    const profileNoName = {
      id: "uw-no-name",
      name: "   ",
      address: "GBV5S74OIWYREQGBNXORIC2D4Y66YMOUQPVIXBHKFPF637GKJKENZBYV",
    };
    const sanitized = sanitizeUnderwriterProfile(profileNoName);
    expect(sanitized.name).toBe("GBV5...ZBYV");
  });

  it("automatically attaches calculated reputation and capacity reconciliation", () => {
    const profile = {
      id: "uw-auto-calc",
      name: "Auto Calc Underwriting",
      address: "GBV5S74OIWYREQGBNXORIC2D4Y66YMOUQPVIXBHKFPF637GKJKENZBYV",
      totalCapacity: 500_000,
      activeCover: 100_000,
      reservedCover: 50_000,
      invoiceHistory: [
        { id: "1", invoiceId: "INV-1", amount: 50000, status: "settled" },
      ],
    };

    const sanitized = sanitizeUnderwriterProfile(profile);
    expect(sanitized.reputation).toBeDefined();
    expect(sanitized.reputation?.score).toBe(100);
    expect(sanitized.capacity).toBeDefined();
    expect(sanitized.capacity?.availableCapacity).toBe(350_000);
  });
});

describe("Follow Preferences Persistence", () => {
  beforeEach(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(UNDERWRITER_FOLLOW_STORAGE_KEY);
    }
  });

  it("toggles follow state and persists to localStorage", () => {
    const id = "uw-test-123";

    expect(isUnderwriterFollowed(id)).toBe(false);

    // Toggle to followed
    const state1 = toggleFollowUnderwriter(id);
    expect(state1).toBe(true);
    expect(isUnderwriterFollowed(id)).toBe(true);
    expect(getFollowedUnderwriters()).toContain(id);

    // Toggle off
    const state2 = toggleFollowUnderwriter(id);
    expect(state2).toBe(false);
    expect(isUnderwriterFollowed(id)).toBe(false);
    expect(getFollowedUnderwriters()).not.toContain(id);
  });

  it("supports explicit follow state parameter", () => {
    const id = "uw-test-explicit";

    toggleFollowUnderwriter(id, true);
    expect(isUnderwriterFollowed(id)).toBe(true);

    toggleFollowUnderwriter(id, true); // idempotent
    expect(isUnderwriterFollowed(id)).toBe(true);

    toggleFollowUnderwriter(id, false);
    expect(isUnderwriterFollowed(id)).toBe(false);
  });

  it("returns false for empty or invalid underwriter ID", () => {
    expect(toggleFollowUnderwriter("")).toBe(false);
    expect(isUnderwriterFollowed("")).toBe(false);
  });
});

describe("Slashing History and Tier Utilities", () => {
  it("sorts slashing events with newest first", () => {
    const events: SlashingEvent[] = [
      {
        id: "1",
        timestamp: "2026-01-01T00:00:00Z",
        reason: "Early arbitration",
        amount: 1000,
        txHash: "hash1",
      },
      {
        id: "2",
        timestamp: "2026-11-01T00:00:00Z",
        reason: "Late payout",
        amount: 5000,
        txHash: "hash2",
      },
      {
        id: "3",
        timestamp: "2026-06-15T00:00:00Z",
        reason: "Collateral haircut",
        amount: 2500,
        txHash: "hash3",
      },
    ];

    const sorted = sortSlashingHistory(events);
    expect(sorted[0].id).toBe("2"); // Nov 2026
    expect(sorted[1].id).toBe("3"); // Jun 2026
    expect(sorted[2].id).toBe("1"); // Jan 2026
  });

  it("maps reputation scores to tiers correctly", () => {
    expect(getUnderwriterTier(null).id).toBe("unrated");
    expect(getUnderwriterTier(undefined).id).toBe("unrated");
    expect(getUnderwriterTier(25).id).toBe("bronze");
    expect(getUnderwriterTier(50).id).toBe("silver");
    expect(getUnderwriterTier(75).id).toBe("gold");
    expect(getUnderwriterTier(95).id).toBe("platinum");
  });
});
