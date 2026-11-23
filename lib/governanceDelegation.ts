import { StrKey } from "stellar-sdk";

export type DelegationScope = "all" | "parameter_only" | "emergency_only";
export type DelegationStatus = "active" | "expired" | "revoked";

export interface GovernanceDelegation {
  id: string;
  keyId: string;
  delegatorAddress: string;
  delegateAddress: string;
  scope: DelegationScope;
  votingWeight: number;
  createdAt: string;
  expiresAt: string;
  status: DelegationStatus;
  revokedAt?: string;
}

export interface DelegationValidationInput {
  keyId: string;
  delegatorAddress: string;
  delegateAddress: string;
  scope: DelegationScope;
  votingWeight: number;
  availableKeys: number;
  expiresAt: string;
  now?: number;
  whitelistEnabled?: boolean;
  whitelistedAddresses?: string[];
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface EffectiveVotingPowerSummary {
  baseWeight: number;
  delegatedOutWeight: number;
  delegatedInWeight: number;
  effectiveWeight: number;
  hasActiveOutgoing: boolean;
  hasActiveIncoming: boolean;
}

/**
 * Validates a new delegation proposal before creating it.
 * Strictly verifies Stellar addresses, non-self delegation, whitelist constraints,
 * valid positive voting weight within available keys, and future expiration.
 */
export function validateDelegation(input: DelegationValidationInput): ValidationResult {
  const {
    delegatorAddress,
    delegateAddress,
    votingWeight,
    availableKeys,
    expiresAt,
    now = Date.now(),
    whitelistEnabled = false,
    whitelistedAddresses = [],
  } = input;

  const trimmedDelegator = delegatorAddress.trim();
  const trimmedDelegate = delegateAddress.trim();

  if (!trimmedDelegator || !StrKey.isValidEd25519PublicKey(trimmedDelegator)) {
    return { valid: false, error: "Invalid delegator Stellar address" };
  }

  if (!trimmedDelegate || !StrKey.isValidEd25519PublicKey(trimmedDelegate)) {
    return { valid: false, error: "Invalid delegate Stellar address" };
  }

  if (trimmedDelegator === trimmedDelegate) {
    return { valid: false, error: "Cannot delegate voting power to your own wallet" };
  }

  if (!Number.isFinite(votingWeight) || votingWeight <= 0) {
    return { valid: false, error: "Delegated voting weight must be greater than zero" };
  }

  if (votingWeight > availableKeys) {
    return {
      valid: false,
      error: `Delegated weight (${votingWeight}) exceeds available keys (${availableKeys})`,
    };
  }

  const expTimestamp = new Date(expiresAt).getTime();
  if (isNaN(expTimestamp) || expTimestamp <= now) {
    return { valid: false, error: "Expiration date must be in the future" };
  }

  if (whitelistEnabled) {
    const isWhitelisted = whitelistedAddresses.some(
      (addr) => addr.trim() === trimmedDelegate
    );
    if (!isWhitelisted) {
      return {
        valid: false,
        error: "Delegate address is not present on the creator key whitelist",
      };
    }
  }

  return { valid: true };
}

/**
 * Determines whether a delegation is actively granting voting power.
 * Automatically treats passed expiration dates as inactive (expired).
 */
export function isDelegationActive(
  delegation: GovernanceDelegation,
  now: number = Date.now()
): boolean {
  if (delegation.status === "revoked") return false;
  const exp = new Date(delegation.expiresAt).getTime();
  if (isNaN(exp) || exp <= now) return false;
  return delegation.status === "active";
}

/**
 * Calculates effective voting power for a user.
 * Custody of creator keys is NEVER transferred: keys stay in the holder's wallet.
 * Only voting rights are delegated.
 *
 * Effective power = baseWeight - activeOutgoingDelegations + activeIncomingDelegations
 */
export function calculateEffectiveVotingPower(
  baseWeight: number,
  outgoingDelegations: GovernanceDelegation[],
  incomingDelegations: GovernanceDelegation[],
  now: number = Date.now(),
  proposalScope?: DelegationScope
): EffectiveVotingPowerSummary {
  const safeBase = Math.max(0, baseWeight);

  const activeOutgoing = outgoingDelegations.filter((d) => {
    if (!isDelegationActive(d, now)) return false;
    if (!proposalScope) return true;
    return d.scope === "all" || d.scope === proposalScope;
  });

  const activeIncoming = incomingDelegations.filter((d) => {
    if (!isDelegationActive(d, now)) return false;
    if (!proposalScope) return true;
    return d.scope === "all" || d.scope === proposalScope;
  });

  const delegatedOutWeight = activeOutgoing.reduce(
    (sum, d) => sum + d.votingWeight,
    0
  );
  const delegatedInWeight = activeIncoming.reduce(
    (sum, d) => sum + d.votingWeight,
    0
  );

  const effectiveWeight = Math.max(0, safeBase - delegatedOutWeight) + delegatedInWeight;

  return {
    baseWeight: safeBase,
    delegatedOutWeight,
    delegatedInWeight,
    effectiveWeight,
    hasActiveOutgoing: activeOutgoing.length > 0,
    hasActiveIncoming: activeIncoming.length > 0,
  };
}

/**
 * Revokes a delegation immediately, restoring voting power to the delegator.
 */
export function revokeDelegation(
  delegationId: string,
  delegations: GovernanceDelegation[],
  now: number = Date.now()
): GovernanceDelegation[] {
  return delegations.map((d) => {
    if (d.id === delegationId) {
      return {
        ...d,
        status: "revoked" as const,
        revokedAt: new Date(now).toISOString(),
      };
    }
    return d;
  });
}

/**
 * Updates expiration or scope of an existing active delegation.
 */
export function updateDelegation(
  delegationId: string,
  updates: Partial<Pick<GovernanceDelegation, "scope" | "expiresAt">>,
  delegations: GovernanceDelegation[],
  now: number = Date.now()
): GovernanceDelegation[] {
  return delegations.map((d) => {
    if (d.id === delegationId) {
      if (d.status === "revoked") {
        throw new Error("Cannot update a revoked delegation");
      }
      return {
        ...d,
        ...updates,
        status: isDelegationActive({ ...d, ...updates }, now) ? "active" : "expired",
      };
    }
    return d;
  });
}

const STORAGE_KEY_PREFIX = "ss_governance_delegations_";

export function loadStoredDelegations(keyId: string): GovernanceDelegation[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${keyId}`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredDelegations(
  keyId: string,
  delegations: GovernanceDelegation[]
): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${keyId}`,
      JSON.stringify(delegations)
    );
  } catch {
    // ignore local storage quota errors
  }
}
