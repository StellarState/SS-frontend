/**
 * Withdrawal Address Allowlist Rules Engine (Issue #668).
 *
 * Implements address allowlisting, mandatory cooldown enforcement,
 * re-authentication verification, expiration tracking, and withdrawal validation.
 */

import { isValidStellarAddress } from "@/lib/destinations";

export type AllowlistEntryStatus =
  | "active"
  | "pending_cooldown"
  | "expired"
  | "removed";

export interface AllowlistEntry {
  id: string;
  address: string;
  label: string;
  status: AllowlistEntryStatus;
  addedAt: string;
  cooldownEndsAt: string;
  expiresAt?: string | null;
}

export interface AllowlistSettings {
  enforced: boolean;
  cooldownHours: number;
  entries: AllowlistEntry[];
  lastReauthTimestamp?: string | null;
}

export const DEFAULT_ALLOWLIST_SETTINGS: AllowlistSettings = {
  enforced: false,
  cooldownHours: 24,
  entries: [],
  lastReauthTimestamp: null,
};

export const REAUTH_SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes valid session

/**
 * Checks whether a user re-authentication session is currently fresh and valid.
 */
export function isReauthSessionValid(
  lastReauthTimestamp?: string | null,
  now = new Date(),
): boolean {
  if (!lastReauthTimestamp) return false;
  const reauthTime = new Date(lastReauthTimestamp).getTime();
  if (Number.isNaN(reauthTime)) return false;
  return now.getTime() - reauthTime <= REAUTH_SESSION_TIMEOUT_MS;
}

/**
 * Evaluates the live effective status of an allowlist entry based on timestamps.
 */
export function evaluateEntryStatus(
  entry: AllowlistEntry,
  now = new Date(),
): AllowlistEntryStatus {
  if (entry.status === "removed") return "removed";

  // Check expiration first
  if (entry.expiresAt) {
    const expTime = new Date(entry.expiresAt).getTime();
    if (!Number.isNaN(expTime) && now.getTime() >= expTime) {
      return "expired";
    }
  }

  // Check cooldown completion
  const cooldownTime = new Date(entry.cooldownEndsAt).getTime();
  if (!Number.isNaN(cooldownTime) && now.getTime() < cooldownTime) {
    return "pending_cooldown";
  }

  return "active";
}

export interface AddEntryInput {
  address: string;
  label: string;
  expiresInDays?: number | null;
}

export interface ValidationRuleResult {
  valid: boolean;
  error?: string;
  entry?: AllowlistEntry;
}

/**
 * Validates and prepares a new allowlist entry requiring mandatory cooldown.
 */
export function createPendingAllowlistEntry(
  input: AddEntryInput,
  settings: AllowlistSettings,
  now = new Date(),
): ValidationRuleResult {
  const address = (input.address || "").trim();
  const label = (input.label || "").trim();

  if (!label) {
    return { valid: false, error: "Label is required for allowlist entry." };
  }

  if (!isValidStellarAddress(address)) {
    return {
      valid: false,
      error: "Invalid Stellar address. Address must start with 'G' and be 56 characters.",
    };
  }

  // Check for duplicates
  const existing = settings.entries.find(
    (e) => e.address.toLowerCase() === address.toLowerCase() && e.status !== "removed",
  );
  if (existing) {
    return {
      valid: false,
      error: `Address is already present in allowlist under '${existing.label}'.`,
    };
  }

  const cooldownEndsAt = new Date(
    now.getTime() + settings.cooldownHours * 60 * 60 * 1000,
  ).toISOString();

  let expiresAt: string | null = null;
  if (input.expiresInDays && input.expiresInDays > 0) {
    expiresAt = new Date(
      now.getTime() + input.expiresInDays * 24 * 60 * 60 * 1000,
    ).toISOString();
  }

  const newEntry: AllowlistEntry = {
    id: `al-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    address,
    label,
    status: "pending_cooldown",
    addedAt: now.toISOString(),
    cooldownEndsAt,
    expiresAt,
  };

  return { valid: true, entry: newEntry };
}

export interface WithdrawalCheckResult {
  allowed: boolean;
  reason?: string;
  matchedEntry?: AllowlistEntry;
}

/**
 * Validates whether a withdrawal destination is permitted under current allowlist rules.
 */
export function validateWithdrawalDestination(
  destinationAddress: string,
  settings: AllowlistSettings,
  now = new Date(),
): WithdrawalCheckResult {
  const addr = (destinationAddress || "").trim();

  // If allowlist enforcement is disabled, allow withdrawal
  if (!settings.enforced) {
    return { allowed: true };
  }

  // When enforced, address must exist in allowlist and be in active status
  const entry = settings.entries.find(
    (e) => e.address.toLowerCase() === addr.toLowerCase(),
  );

  if (!entry) {
    return {
      allowed: false,
      reason:
        "Withdrawal blocked: Destination address is not in your enforced allowlist. Add this address or disable allowlist enforcement to proceed.",
    };
  }

  const currentStatus = evaluateEntryStatus(entry, now);

  if (currentStatus === "pending_cooldown") {
    const hoursLeft = Math.max(
      0.1,
      (new Date(entry.cooldownEndsAt).getTime() - now.getTime()) / (1000 * 60 * 60),
    );
    return {
      allowed: false,
      reason: `Withdrawal blocked: Destination '${entry.label}' is in mandatory security cooldown (~${hoursLeft.toFixed(1)}h remaining).`,
      matchedEntry: entry,
    };
  }

  if (currentStatus === "expired") {
    return {
      allowed: false,
      reason: `Withdrawal blocked: Allowlist permission for '${entry.label}' expired on ${new Date(entry.expiresAt!).toLocaleDateString()}.`,
      matchedEntry: entry,
    };
  }

  if (currentStatus === "removed") {
    return {
      allowed: false,
      reason: `Withdrawal blocked: Destination '${entry.label}' has been removed from allowlist.`,
      matchedEntry: entry,
    };
  }

  return {
    allowed: true,
    matchedEntry: entry,
  };
}
