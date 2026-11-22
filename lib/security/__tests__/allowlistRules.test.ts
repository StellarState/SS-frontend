import {
  createPendingAllowlistEntry,
  validateWithdrawalDestination,
  evaluateEntryStatus,
  isReauthSessionValid,
  type AllowlistSettings,
  type AllowlistEntry,
} from "@/lib/security/allowlistRules";

const VALID_ADDR_1 = "GBZXN7PIRZGNMHGA72XZTOFGDPTGWTQ5QOFKWCZXUJ2GBXMHOCP4PJTV";
const VALID_ADDR_2 = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7";

describe("Withdrawal Address Allowlist Engine (Issue #668)", () => {
  const baseSettings: AllowlistSettings = {
    enforced: true,
    cooldownHours: 24,
    entries: [],
    lastReauthTimestamp: new Date().toISOString(),
  };

  it("permits any destination when allowlist enforcement is disabled", () => {
    const disabledSettings: AllowlistSettings = {
      ...baseSettings,
      enforced: false,
    };
    const res = validateWithdrawalDestination(VALID_ADDR_1, disabledSettings);
    expect(res.allowed).toBe(true);
  });

  it("blocks withdrawals to unregistered addresses when enforced", () => {
    const res = validateWithdrawalDestination(VALID_ADDR_1, baseSettings);
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain("Destination address is not in your enforced allowlist");
  });

  it("creates a pending allowlist entry with mandatory cooldown", () => {
    const now = new Date("2026-11-22T10:00:00Z");
    const res = createPendingAllowlistEntry(
      { address: VALID_ADDR_1, label: "Cold Vault" },
      baseSettings,
      now,
    );

    expect(res.valid).toBe(true);
    expect(res.entry?.status).toBe("pending_cooldown");
    expect(res.entry?.cooldownEndsAt).toBe("2026-11-23T10:00:00.000Z"); // +24 hours
  });

  it("blocks withdrawals while address is in cooldown", () => {
    const now = new Date("2026-11-22T12:00:00Z");
    const entry: AllowlistEntry = {
      id: "entry-1",
      address: VALID_ADDR_1,
      label: "Vault",
      status: "pending_cooldown",
      addedAt: "2026-11-22T10:00:00Z",
      cooldownEndsAt: "2026-11-23T10:00:00Z",
    };

    const settings: AllowlistSettings = {
      ...baseSettings,
      entries: [entry],
    };

    const res = validateWithdrawalDestination(VALID_ADDR_1, settings, now);
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain("is in mandatory security cooldown");
  });

  it("permits withdrawals once cooldown has successfully elapsed", () => {
    const postCooldown = new Date("2026-11-24T12:00:00Z");
    const entry: AllowlistEntry = {
      id: "entry-1",
      address: VALID_ADDR_1,
      label: "Vault",
      status: "pending_cooldown",
      addedAt: "2026-11-22T10:00:00Z",
      cooldownEndsAt: "2026-11-23T10:00:00Z",
    };

    const settings: AllowlistSettings = {
      ...baseSettings,
      entries: [entry],
    };

    const res = validateWithdrawalDestination(VALID_ADDR_1, settings, postCooldown);
    expect(res.allowed).toBe(true);
  });

  it("blocks withdrawals when an address has expired", () => {
    const now = new Date("2026-12-01T00:00:00Z");
    const entry: AllowlistEntry = {
      id: "entry-1",
      address: VALID_ADDR_1,
      label: "Temp Vendor",
      status: "active",
      addedAt: "2026-11-01T00:00:00Z",
      cooldownEndsAt: "2026-11-02T00:00:00Z",
      expiresAt: "2026-11-15T00:00:00Z", // expired
    };

    const settings: AllowlistSettings = {
      ...baseSettings,
      entries: [entry],
    };

    const res = validateWithdrawalDestination(VALID_ADDR_1, settings, now);
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain("expired on");
  });

  it("validates re-authentication session expiration", () => {
    const now = new Date("2026-11-22T10:30:00Z");
    const recent = new Date("2026-11-22T10:20:00Z").toISOString(); // 10m ago (valid <= 15m)
    const old = new Date("2026-11-22T10:00:00Z").toISOString(); // 30m ago (expired)

    expect(isReauthSessionValid(recent, now)).toBe(true);
    expect(isReauthSessionValid(old, now)).toBe(false);
    expect(isReauthSessionValid(null, now)).toBe(false);
  });
});
