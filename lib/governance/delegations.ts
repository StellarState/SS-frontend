/**
 * Creator-Key Governance Delegations Domain Logic (Issue #692)
 *
 * Enables voting delegation for creator key holders without custody transfer:
 * - Delegation of voting power without transferring custody of keys
 * - Whitelist constraints enforcement when creator key whitelist mode is active
 * - Scope definition (all proposals vs specific proposal)
 * - Expiration enforcement: expired delegations cannot vote
 * - Immediate revocation restoring voting power to the delegator
 * - Effective voting power calculation factoring incoming & outgoing delegations
 */

import { StrKey } from "stellar-sdk";

export type DelegationScope = "all_proposals" | "specific_proposal";
export type DelegationStatus = "active" | "expired" | "revoked";

export interface GovernanceDelegation {
  id: string;
  keyId: string;
  delegatorAddress: string;
  delegateAddress: string;
  votingPower: number; // Number of key votes delegated
  scope: DelegationScope;
  targetProposalId?: string | null;
  createdAt: string;
  expiresAt: string; // ISO date string
  status: DelegationStatus;
  whitelistVerified: boolean;
}

export interface WhitelistValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates a target delegate address against Stellar Ed25519 public key format
 * and creator key whitelist rules.
 */
export function validateDelegationTarget(params: {
  delegateAddress: string;
  delegatorAddress: string;
  whitelistEnabled: boolean;
  whitelistedAddresses?: string[];
}): WhitelistValidationResult {
  const {
    delegateAddress,
    delegatorAddress,
    whitelistEnabled,
    whitelistedAddresses = [],
  } = params;

  const trimmed = delegateAddress.trim();

  if (!trimmed) {
    return { isValid: false, error: "Delegate wallet address is required." };
  }

  if (!StrKey.isValidEd25519PublicKey(trimmed)) {
    return {
      isValid: false,
      error: "Invalid Stellar public key format (must start with G and be 56 characters).",
    };
  }

  if (trimmed === delegatorAddress.trim()) {
    return {
      isValid: false,
      error: "Cannot delegate voting power to your own wallet address.",
    };
  }

  if (whitelistEnabled) {
    const isWhitelisted = whitelistedAddresses.some(
      (addr) => addr.trim() === trimmed
    );
    if (!isWhitelisted) {
      return {
        isValid: false,
        error:
          "Target delegate address is not on the creator key whitelist. Whitelist constraints require delegates to be pre-approved.",
      };
    }
  }

  return { isValid: true };
}

/**
 * Checks if a delegation is currently active and non-expired.
 */
export function isDelegationActive(
  delegation: GovernanceDelegation,
  nowMs: number = Date.now()
): boolean {
  if (delegation.status === "revoked") {
    return false;
  }
  const expiryTime = new Date(delegation.expiresAt).getTime();
  return Number.isFinite(expiryTime) && expiryTime > nowMs;
}

/**
 * Calculates effective voting power for a wallet on a creator key:
 * - Direct custody key balance
 * - Minus active outgoing delegations
 * - Plus active incoming delegations
 *
 * IMPORTANT: Direct custody of creator keys remains 100% with the holder.
 */
export function calculateEffectiveVotingPower(params: {
  ownCustodyKeys: number;
  outgoingDelegations: GovernanceDelegation[];
  incomingDelegations?: GovernanceDelegation[];
  targetProposalId?: string;
  nowMs?: number;
}): {
  ownCustodyKeys: number;
  delegatedOut: number;
  delegatedIn: number;
  effectiveVotingPower: number;
} {
  const {
    ownCustodyKeys,
    outgoingDelegations,
    incomingDelegations = [],
    targetProposalId,
    nowMs = Date.now(),
  } = params;

  const validOut = outgoingDelegations.filter((d) => {
    if (!isDelegationActive(d, nowMs)) return false;
    if (d.scope === "specific_proposal" && targetProposalId) {
      return d.targetProposalId === targetProposalId;
    }
    return true;
  });

  const validIn = incomingDelegations.filter((d) => {
    if (!isDelegationActive(d, nowMs)) return false;
    if (d.scope === "specific_proposal" && targetProposalId) {
      return d.targetProposalId === targetProposalId;
    }
    return true;
  });

  const delegatedOut = validOut.reduce((sum, d) => sum + d.votingPower, 0);
  const delegatedIn = validIn.reduce((sum, d) => sum + d.votingPower, 0);

  const remainingOwnPower = Math.max(0, ownCustodyKeys - delegatedOut);
  const effectiveVotingPower = remainingOwnPower + delegatedIn;

  return {
    ownCustodyKeys,
    delegatedOut,
    delegatedIn,
    effectiveVotingPower,
  };
}

/**
 * Creates a new governance delegation.
 */
export function createDelegation(params: {
  id: string;
  keyId: string;
  delegatorAddress: string;
  delegateAddress: string;
  votingPower: number;
  scope: DelegationScope;
  targetProposalId?: string | null;
  expiresInDays: number;
  whitelistEnabled: boolean;
  whitelistedAddresses?: string[];
  nowMs?: number;
}): GovernanceDelegation {
  const {
    id,
    keyId,
    delegatorAddress,
    delegateAddress,
    votingPower,
    scope,
    targetProposalId,
    expiresInDays,
    whitelistEnabled,
    whitelistedAddresses = [],
    nowMs = Date.now(),
  } = params;

  if (votingPower <= 0) {
    throw new Error("Delegated voting power must be greater than zero.");
  }

  const validation = validateDelegationTarget({
    delegateAddress,
    delegatorAddress,
    whitelistEnabled,
    whitelistedAddresses,
  });

  if (!validation.isValid) {
    throw new Error(validation.error || "Invalid delegation target.");
  }

  const createdAt = new Date(nowMs).toISOString();
  const expiresAt = new Date(nowMs + expiresInDays * 86_400_000).toISOString();

  return {
    id,
    keyId,
    delegatorAddress,
    delegateAddress: delegateAddress.trim(),
    votingPower,
    scope,
    targetProposalId: scope === "specific_proposal" ? targetProposalId : null,
    createdAt,
    expiresAt,
    status: "active",
    whitelistVerified: whitelistEnabled,
  };
}

/**
 * Revokes an existing delegation and restores voting power to the delegator.
 */
export function revokeDelegation(
  delegationId: string,
  delegations: GovernanceDelegation[]
): GovernanceDelegation[] {
  return delegations.map((d) => {
    if (d.id === delegationId) {
      return {
        ...d,
        status: "revoked" as const,
      };
    }
    return d;
  });
}

export const SAMPLE_DELEGATIONS: GovernanceDelegation[] = [
  {
    id: "DEL-2026-001",
    keyId: "creator-key-solaris-1",
    delegatorAddress: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
    delegateAddress: "GDANW55RBL4AM5BLGIJG4G6PLZDPAJ75V4RWNG7HCN5C44CG5X5CZLTS",
    votingPower: 25,
    scope: "all_proposals",
    createdAt: "2026-11-01T10:00:00Z",
    expiresAt: "2026-12-31T23:59:59Z",
    status: "active",
    whitelistVerified: true,
  },
  {
    id: "DEL-2026-002-EXPIRED",
    keyId: "creator-key-solaris-1",
    delegatorAddress: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
    delegateAddress: "GBEH6X5KIRWHDNE5J6SRAS4KDMXDXTKKZNQAAK23WP4SKN55HRBMPISR",
    votingPower: 10,
    scope: "all_proposals",
    createdAt: "2026-10-01T10:00:00Z",
    expiresAt: "2026-11-01T10:00:00Z",
    status: "expired",
    whitelistVerified: true,
  },
];
