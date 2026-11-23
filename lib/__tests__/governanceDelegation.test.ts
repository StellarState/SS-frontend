import { describe, expect, it } from "vitest";
import {
  calculateEffectiveVotingPower,
  isDelegationActive,
  revokeDelegation,
  updateDelegation,
  validateDelegation,
  type GovernanceDelegation,
} from "../governanceDelegation";

// Valid Stellar Ed25519 public keys for tests
const ADDR_1 = "GCKX6ZIFGPDAUBC7S67YP2AQQVXN2EPHSZ7JAAPIKVWZHWLP6Y2XULT2";
const ADDR_2 = "GDS63336SMAQPGXTGEYM4DIG7Q6UGS67ZAWFSBBS3WQZA2IUU5D4HYTK";
const ADDR_3 = "GCCPEBN6CZQD6UO3YIKQ5YNZTDNBWOSP6NRTAY6ZAM54MKZEEU2EVKWE";

describe("governanceDelegation", () => {
  const baseTime = new Date("2026-11-25T12:00:00Z").getTime();
  const futureExpiry = new Date(baseTime + 86400000 * 7).toISOString(); // +7 days
  const pastExpiry = new Date(baseTime - 86400000).toISOString(); // -1 day

  describe("validateDelegation", () => {
    it("accepts a valid delegation input", () => {
      const res = validateDelegation({
        keyId: "key-1",
        delegatorAddress: ADDR_1,
        delegateAddress: ADDR_2,
        scope: "all",
        votingWeight: 5,
        availableKeys: 10,
        expiresAt: futureExpiry,
        now: baseTime,
      });
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it("rejects invalid Stellar delegator or delegate address", () => {
      const res1 = validateDelegation({
        keyId: "key-1",
        delegatorAddress: "invalid-addr",
        delegateAddress: ADDR_2,
        scope: "all",
        votingWeight: 1,
        availableKeys: 10,
        expiresAt: futureExpiry,
        now: baseTime,
      });
      expect(res1.valid).toBe(false);
      expect(res1.error).toContain("Invalid delegator");

      const res2 = validateDelegation({
        keyId: "key-1",
        delegatorAddress: ADDR_1,
        delegateAddress: "not-a-stellar-key",
        scope: "all",
        votingWeight: 1,
        availableKeys: 10,
        expiresAt: futureExpiry,
        now: baseTime,
      });
      expect(res2.valid).toBe(false);
      expect(res2.error).toContain("Invalid delegate");
    });

    it("rejects delegating to own address", () => {
      const res = validateDelegation({
        keyId: "key-1",
        delegatorAddress: ADDR_1,
        delegateAddress: ADDR_1,
        scope: "all",
        votingWeight: 5,
        availableKeys: 10,
        expiresAt: futureExpiry,
        now: baseTime,
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain("own wallet");
    });

    it("rejects weight higher than available keys or non-positive weight", () => {
      const res1 = validateDelegation({
        keyId: "key-1",
        delegatorAddress: ADDR_1,
        delegateAddress: ADDR_2,
        scope: "all",
        votingWeight: 15,
        availableKeys: 10,
        expiresAt: futureExpiry,
        now: baseTime,
      });
      expect(res1.valid).toBe(false);
      expect(res1.error).toContain("exceeds available keys");

      const res2 = validateDelegation({
        keyId: "key-1",
        delegatorAddress: ADDR_1,
        delegateAddress: ADDR_2,
        scope: "all",
        votingWeight: 0,
        availableKeys: 10,
        expiresAt: futureExpiry,
        now: baseTime,
      });
      expect(res2.valid).toBe(false);
      expect(res2.error).toContain("greater than zero");
    });

    it("rejects past expiration date", () => {
      const res = validateDelegation({
        keyId: "key-1",
        delegatorAddress: ADDR_1,
        delegateAddress: ADDR_2,
        scope: "all",
        votingWeight: 5,
        availableKeys: 10,
        expiresAt: pastExpiry,
        now: baseTime,
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain("future");
    });

    it("enforces whitelist when whitelist is enabled", () => {
      const resBlocked = validateDelegation({
        keyId: "key-1",
        delegatorAddress: ADDR_1,
        delegateAddress: ADDR_2,
        scope: "all",
        votingWeight: 5,
        availableKeys: 10,
        expiresAt: futureExpiry,
        now: baseTime,
        whitelistEnabled: true,
        whitelistedAddresses: [ADDR_3],
      });
      expect(resBlocked.valid).toBe(false);
      expect(resBlocked.error).toContain("creator key whitelist");

      const resAllowed = validateDelegation({
        keyId: "key-1",
        delegatorAddress: ADDR_1,
        delegateAddress: ADDR_2,
        scope: "all",
        votingWeight: 5,
        availableKeys: 10,
        expiresAt: futureExpiry,
        now: baseTime,
        whitelistEnabled: true,
        whitelistedAddresses: [ADDR_2, ADDR_3],
      });
      expect(resAllowed.valid).toBe(true);
    });
  });

  describe("isDelegationActive", () => {
    it("returns true for active delegation before expiration", () => {
      const delegation: GovernanceDelegation = {
        id: "d1",
        keyId: "k1",
        delegatorAddress: ADDR_1,
        delegateAddress: ADDR_2,
        scope: "all",
        votingWeight: 4,
        createdAt: new Date(baseTime).toISOString(),
        expiresAt: futureExpiry,
        status: "active",
      };
      expect(isDelegationActive(delegation, baseTime)).toBe(true);
    });

    it("returns false if expired or revoked", () => {
      const expiredDel: GovernanceDelegation = {
        id: "d1",
        keyId: "k1",
        delegatorAddress: ADDR_1,
        delegateAddress: ADDR_2,
        scope: "all",
        votingWeight: 4,
        createdAt: new Date(baseTime - 86400000 * 2).toISOString(),
        expiresAt: pastExpiry,
        status: "active",
      };
      expect(isDelegationActive(expiredDel, baseTime)).toBe(false);

      const revokedDel: GovernanceDelegation = {
        ...expiredDel,
        expiresAt: futureExpiry,
        status: "revoked",
      };
      expect(isDelegationActive(revokedDel, baseTime)).toBe(false);
    });
  });

  describe("calculateEffectiveVotingPower", () => {
    it("does not transfer key custody: adjusts effective power correctly", () => {
      const outgoing: GovernanceDelegation[] = [
        {
          id: "out-1",
          keyId: "k1",
          delegatorAddress: ADDR_1,
          delegateAddress: ADDR_2,
          scope: "all",
          votingWeight: 3,
          createdAt: new Date(baseTime).toISOString(),
          expiresAt: futureExpiry,
          status: "active",
        },
      ];

      const incoming: GovernanceDelegation[] = [
        {
          id: "in-1",
          keyId: "k1",
          delegatorAddress: ADDR_3,
          delegateAddress: ADDR_1,
          scope: "all",
          votingWeight: 5,
          createdAt: new Date(baseTime).toISOString(),
          expiresAt: futureExpiry,
          status: "active",
        },
      ];

      // Base weight: 10 keys. Delegated out: 3. Delegated in: 5. Effective: 10 - 3 + 5 = 12
      const summary = calculateEffectiveVotingPower(10, outgoing, incoming, baseTime);
      expect(summary.baseWeight).toBe(10);
      expect(summary.delegatedOutWeight).toBe(3);
      expect(summary.delegatedInWeight).toBe(5);
      expect(summary.effectiveWeight).toBe(12);
      expect(summary.hasActiveOutgoing).toBe(true);
      expect(summary.hasActiveIncoming).toBe(true);
    });

    it("discounts expired delegations so expired delegations cannot vote", () => {
      const outgoingExpired: GovernanceDelegation[] = [
        {
          id: "out-1",
          keyId: "k1",
          delegatorAddress: ADDR_1,
          delegateAddress: ADDR_2,
          scope: "all",
          votingWeight: 4,
          createdAt: new Date(baseTime - 86400000 * 2).toISOString(),
          expiresAt: pastExpiry,
          status: "active",
        },
      ];

      const summary = calculateEffectiveVotingPower(10, outgoingExpired, [], baseTime);
      expect(summary.delegatedOutWeight).toBe(0);
      expect(summary.effectiveWeight).toBe(10);
    });

    it("respects proposal scope constraints", () => {
      const paramOnly: GovernanceDelegation[] = [
        {
          id: "out-1",
          keyId: "k1",
          delegatorAddress: ADDR_1,
          delegateAddress: ADDR_2,
          scope: "parameter_only",
          votingWeight: 4,
          createdAt: new Date(baseTime).toISOString(),
          expiresAt: futureExpiry,
          status: "active",
        },
      ];

      // If proposal scope is emergency_only, param_only delegation does not apply
      const summaryEmergency = calculateEffectiveVotingPower(
        10,
        paramOnly,
        [],
        baseTime,
        "emergency_only"
      );
      expect(summaryEmergency.delegatedOutWeight).toBe(0);
      expect(summaryEmergency.effectiveWeight).toBe(10);

      // If proposal scope is parameter_only, delegation applies
      const summaryParam = calculateEffectiveVotingPower(
        10,
        paramOnly,
        [],
        baseTime,
        "parameter_only"
      );
      expect(summaryParam.delegatedOutWeight).toBe(4);
      expect(summaryParam.effectiveWeight).toBe(6);
    });
  });

  describe("revokeDelegation & updateDelegation", () => {
    it("revoking restores voting power immediately", () => {
      const list: GovernanceDelegation[] = [
        {
          id: "d-1",
          keyId: "k1",
          delegatorAddress: ADDR_1,
          delegateAddress: ADDR_2,
          scope: "all",
          votingWeight: 5,
          createdAt: new Date(baseTime).toISOString(),
          expiresAt: futureExpiry,
          status: "active",
        },
      ];

      const updated = revokeDelegation("d-1", list, baseTime);
      expect(updated[0].status).toBe("revoked");
      expect(updated[0].revokedAt).toBeDefined();

      const summary = calculateEffectiveVotingPower(10, updated, [], baseTime);
      expect(summary.effectiveWeight).toBe(10);
      expect(summary.delegatedOutWeight).toBe(0);
    });

    it("updates delegation scope and expiration", () => {
      const list: GovernanceDelegation[] = [
        {
          id: "d-1",
          keyId: "k1",
          delegatorAddress: ADDR_1,
          delegateAddress: ADDR_2,
          scope: "all",
          votingWeight: 5,
          createdAt: new Date(baseTime).toISOString(),
          expiresAt: futureExpiry,
          status: "active",
        },
      ];

      const newExpiry = new Date(baseTime + 86400000 * 30).toISOString();
      const updated = updateDelegation(
        "d-1",
        { scope: "emergency_only", expiresAt: newExpiry },
        list,
        baseTime
      );
      expect(updated[0].scope).toBe("emergency_only");
      expect(updated[0].expiresAt).toBe(newExpiry);
    });
  });
});
