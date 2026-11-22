import { describe, it, expect } from "vitest";
import {
  validateDelegationTarget,
  isDelegationActive,
  calculateEffectiveVotingPower,
  createDelegation,
  revokeDelegation,
  SAMPLE_DELEGATIONS,
  GovernanceDelegation,
} from "../delegations";

describe("governance delegations domain logic (#692)", () => {
  const delegator = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
  const validDelegate = "GDANW55RBL4AM5BLGIJG4G6PLZDPAJ75V4RWNG7HCN5C44CG5X5CZLTS";
  const nonWhitelistedDelegate = "GBEH6X5KIRWHDNE5J6SRAS4KDMXDXTKKZNQAAK23WP4SKN55HRBMPISR";

  describe("validateDelegationTarget & whitelist constraints", () => {
    it("rejects empty or whitespace delegate address", () => {
      const res = validateDelegationTarget({
        delegateAddress: "",
        delegatorAddress: delegator,
        whitelistEnabled: false,
      });
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("required");
    });

    it("rejects invalid Stellar Ed25519 public key format", () => {
      const res = validateDelegationTarget({
        delegateAddress: "not-a-valid-stellar-key",
        delegatorAddress: delegator,
        whitelistEnabled: false,
      });
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("Invalid Stellar public key");
    });

    it("rejects delegating to own wallet address", () => {
      const res = validateDelegationTarget({
        delegateAddress: delegator,
        delegatorAddress: delegator,
        whitelistEnabled: false,
      });
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("own wallet address");
    });

    it("enforces whitelist constraints when whitelist is enabled", () => {
      const resRejected = validateDelegationTarget({
        delegateAddress: nonWhitelistedDelegate,
        delegatorAddress: delegator,
        whitelistEnabled: true,
        whitelistedAddresses: [validDelegate],
      });
      expect(resRejected.isValid).toBe(false);
      expect(resRejected.error).toContain("not on the creator key whitelist");

      const resAllowed = validateDelegationTarget({
        delegateAddress: validDelegate,
        delegatorAddress: delegator,
        whitelistEnabled: true,
        whitelistedAddresses: [validDelegate],
      });
      expect(resAllowed.isValid).toBe(true);
    });

    it("allows any valid Stellar address when whitelist is disabled", () => {
      const res = validateDelegationTarget({
        delegateAddress: nonWhitelistedDelegate,
        delegatorAddress: delegator,
        whitelistEnabled: false,
      });
      expect(res.isValid).toBe(true);
    });
  });

  describe("isDelegationActive", () => {
    it("returns true for active, non-expired delegations", () => {
      const now = Date.now();
      const activeDel: GovernanceDelegation = {
        id: "d1",
        keyId: "k1",
        delegatorAddress: delegator,
        delegateAddress: validDelegate,
        votingPower: 10,
        scope: "all_proposals",
        createdAt: new Date(now - 10000).toISOString(),
        expiresAt: new Date(now + 86400000).toISOString(),
        status: "active",
        whitelistVerified: false,
      };

      expect(isDelegationActive(activeDel, now)).toBe(true);
    });

    it("returns false for expired delegations", () => {
      const now = Date.now();
      const expiredDel: GovernanceDelegation = {
        id: "d2",
        keyId: "k1",
        delegatorAddress: delegator,
        delegateAddress: validDelegate,
        votingPower: 10,
        scope: "all_proposals",
        createdAt: new Date(now - 86400000).toISOString(),
        expiresAt: new Date(now - 1000).toISOString(),
        status: "expired",
        whitelistVerified: false,
      };

      expect(isDelegationActive(expiredDel, now)).toBe(false);
    });

    it("returns false for revoked delegations even if unexpired", () => {
      const now = Date.now();
      const revokedDel: GovernanceDelegation = {
        id: "d3",
        keyId: "k1",
        delegatorAddress: delegator,
        delegateAddress: validDelegate,
        votingPower: 10,
        scope: "all_proposals",
        createdAt: new Date(now - 10000).toISOString(),
        expiresAt: new Date(now + 86400000).toISOString(),
        status: "revoked",
        whitelistVerified: false,
      };

      expect(isDelegationActive(revokedDel, now)).toBe(false);
    });
  });

  describe("calculateEffectiveVotingPower & Custody Invariant", () => {
    it("preserves 100% direct custody while updating effective voting power", () => {
      const ownCustodyKeys = 100;
      const now = Date.now();

      const activeOut: GovernanceDelegation = {
        id: "del-out",
        keyId: "k1",
        delegatorAddress: delegator,
        delegateAddress: validDelegate,
        votingPower: 30,
        scope: "all_proposals",
        createdAt: new Date(now - 1000).toISOString(),
        expiresAt: new Date(now + 86400000).toISOString(),
        status: "active",
        whitelistVerified: false,
      };

      const metrics = calculateEffectiveVotingPower({
        ownCustodyKeys,
        outgoingDelegations: [activeOut],
        incomingDelegations: [],
        nowMs: now,
      });

      // Custody invariant: keys NEVER transfer
      expect(metrics.ownCustodyKeys).toBe(100);
      expect(metrics.delegatedOut).toBe(30);
      expect(metrics.delegatedIn).toBe(0);
      // Effective power is 100 - 30 = 70
      expect(metrics.effectiveVotingPower).toBe(70);
    });

    it("adds incoming active delegations to effective voting power", () => {
      const ownCustodyKeys = 20;
      const now = Date.now();

      const activeIn: GovernanceDelegation = {
        id: "del-in",
        keyId: "k1",
        delegatorAddress: validDelegate,
        delegateAddress: delegator,
        votingPower: 50,
        scope: "all_proposals",
        createdAt: new Date(now - 1000).toISOString(),
        expiresAt: new Date(now + 86400000).toISOString(),
        status: "active",
        whitelistVerified: false,
      };

      const metrics = calculateEffectiveVotingPower({
        ownCustodyKeys,
        outgoingDelegations: [],
        incomingDelegations: [activeIn],
        nowMs: now,
      });

      expect(metrics.ownCustodyKeys).toBe(20);
      expect(metrics.delegatedIn).toBe(50);
      // Effective power is 20 + 50 = 70
      expect(metrics.effectiveVotingPower).toBe(70);
    });
  });

  describe("revokeDelegation", () => {
    it("revokes delegation and restores full voting power to delegator", () => {
      const now = Date.now();
      const activeDel: GovernanceDelegation = {
        id: "del-to-revoke",
        keyId: "k1",
        delegatorAddress: delegator,
        delegateAddress: validDelegate,
        votingPower: 25,
        scope: "all_proposals",
        createdAt: new Date(now - 1000).toISOString(),
        expiresAt: new Date(now + 86400000).toISOString(),
        status: "active",
        whitelistVerified: false,
      };

      const updated = revokeDelegation("del-to-revoke", [activeDel]);
      expect(updated[0].status).toBe("revoked");

      // Recalculating voting power confirms power is restored
      const metricsAfterRevoke = calculateEffectiveVotingPower({
        ownCustodyKeys: 100,
        outgoingDelegations: updated,
        nowMs: now,
      });

      expect(metricsAfterRevoke.delegatedOut).toBe(0);
      expect(metricsAfterRevoke.effectiveVotingPower).toBe(100);
    });
  });
});
