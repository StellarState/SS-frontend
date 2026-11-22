import { describe, it, expect } from "vitest";
import {
  computeReadinessScore,
  initiateRecoveryAddressChange,
  isCooldownCompleted,
  formatCooldownRemaining,
  INITIAL_RECOVERY_CONTROLS,
  RecoveryControlItem,
} from "../recoveryReadiness";

describe("Wallet Recovery Readiness Logic (#673)", () => {
  it("calculates weighted readiness score and correct status tier", () => {
    // Initial controls: secondary_signer (35) + backup_email (20) = 55% -> moderate
    const initialRes = computeReadinessScore(INITIAL_RECOVERY_CONTROLS);
    expect(initialRes.score).toBe(55);
    expect(initialRes.tier).toBe("moderate");

    // All controls configured -> 100% -> robust
    const allConfigured: RecoveryControlItem[] = INITIAL_RECOVERY_CONTROLS.map((c) => ({
      ...c,
      isConfigured: true,
    }));
    const fullRes = computeReadinessScore(allConfigured);
    expect(fullRes.score).toBe(100);
    expect(fullRes.tier).toBe("robust");

    // No controls configured -> 0% -> critical
    const noneConfigured: RecoveryControlItem[] = INITIAL_RECOVERY_CONTROLS.map((c) => ({
      ...c,
      isConfigured: false,
    }));
    const zeroRes = computeReadinessScore(noneConfigured);
    expect(zeroRes.score).toBe(0);
    expect(zeroRes.tier).toBe("critical");
  });

  it("initiates recovery address change with a mandatory 48-hour cooldown timelock", () => {
    const nowMs = 1700000000000;
    const targetAddress = "GCNEWRECOVERYGUARDIAN99881122334455667788STLT";

    const cooldown = initiateRecoveryAddressChange(targetAddress, 48, nowMs);

    expect(cooldown.pendingAddress).toBe(targetAddress);
    expect(cooldown.cooldownHours).toBe(48);
    expect(cooldown.cooldownEndsAt).toBe(new Date(nowMs + 48 * 3600000).toISOString());

    // Initially not completed
    expect(isCooldownCompleted(cooldown, nowMs)).toBe(false);
    expect(isCooldownCompleted(cooldown, nowMs + 24 * 3600000)).toBe(false);

    // Completed after 48 hours
    expect(isCooldownCompleted(cooldown, nowMs + 48 * 3600000)).toBe(true);
    expect(isCooldownCompleted(cooldown, nowMs + 50 * 3600000)).toBe(true);
  });

  it("formats cooldown duration remaining accurately", () => {
    const nowMs = 1700000000000;
    const endsMs = nowMs + (47 * 3600000 + 30 * 60000); // 47h 30m

    expect(formatCooldownRemaining(new Date(endsMs).toISOString(), nowMs)).toBe("47h 30m remaining");

    // Under 1 hour
    const shortEndsMs = nowMs + 45 * 60000;
    expect(formatCooldownRemaining(new Date(shortEndsMs).toISOString(), nowMs)).toBe("45m remaining");

    // Completed
    expect(formatCooldownRemaining(new Date(nowMs - 1000).toISOString(), nowMs)).toBe(
      "Cooldown completed - Ready to apply"
    );
  });

  it("rejects empty target recovery address", () => {
    expect(() => initiateRecoveryAddressChange("   ")).toThrow(
      "Target recovery address cannot be empty."
    );
  });

  it("strictly enforces zero secret exposure policy across recovery profiles", () => {
    for (const control of INITIAL_RECOVERY_CONTROLS) {
      const obj = control as unknown as Record<string, unknown>;
      expect(obj["seedPhrase"]).toBeUndefined();
      expect(obj["privateKey"]).toBeUndefined();
      expect(obj["secretKey"]).toBeUndefined();
    }
  });
});
