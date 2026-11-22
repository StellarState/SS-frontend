/**
 * Wallet Recovery Readiness Domain Logic (Issue #673)
 *
 * Implements wallet recovery posture assessment:
 * - Quantified readiness score (0 - 100%) and tier (critical, moderate, robust)
 * - Configured secondary-wallet and guardian controls
 * - 48-hour security timelock cooldown for recovery address changes
 * - Strict zero-secret policy: never requests or handles private keys or seed phrases
 */

export type RecoveryControlId =
  | "secondary_signer"
  | "backup_email"
  | "hardware_key"
  | "emergency_contact";

export interface RecoveryControlItem {
  id: RecoveryControlId;
  title: string;
  description: string;
  weight: number; // percentage of total score
  isConfigured: boolean;
  details?: string;
  configuredAt?: string | null;
}

export interface RecoveryAddressCooldown {
  pendingAddress: string;
  requestedAt: string;
  cooldownEndsAt: string;
  cooldownHours: number;
}

export interface WalletRecoveryReadinessProfile {
  walletPublicKey: string;
  readinessScore: number;
  statusTier: "critical" | "moderate" | "robust";
  items: RecoveryControlItem[];
  currentRecoveryAddress: string | null;
  activeCooldown: RecoveryAddressCooldown | null;
}

export const DEFAULT_COOLDOWN_HOURS = 48;

export function computeReadinessScore(items: RecoveryControlItem[]): {
  score: number;
  tier: "critical" | "moderate" | "robust";
} {
  const score = items.reduce((sum, item) => (item.isConfigured ? sum + item.weight : sum), 0);
  const clampedScore = Math.min(100, Math.max(0, Math.round(score)));

  let tier: "critical" | "moderate" | "robust" = "critical";
  if (clampedScore >= 80) {
    tier = "robust";
  } else if (clampedScore >= 50) {
    tier = "moderate";
  }

  return { score: clampedScore, tier };
}

export function initiateRecoveryAddressChange(
  pendingAddress: string,
  cooldownHours: number = DEFAULT_COOLDOWN_HOURS,
  nowMs: number = Date.now()
): RecoveryAddressCooldown {
  if (!pendingAddress || pendingAddress.trim() === "") {
    throw new Error("Target recovery address cannot be empty.");
  }

  const requestedAt = new Date(nowMs).toISOString();
  const cooldownEndsAt = new Date(nowMs + cooldownHours * 60 * 60 * 1000).toISOString();

  return {
    pendingAddress: pendingAddress.trim(),
    requestedAt,
    cooldownEndsAt,
    cooldownHours,
  };
}

export function isCooldownCompleted(
  cooldown: RecoveryAddressCooldown | null,
  nowMs: number = Date.now()
): boolean {
  if (!cooldown) return false;
  const endsMs = new Date(cooldown.cooldownEndsAt).getTime();
  return nowMs >= endsMs;
}

export function formatCooldownRemaining(
  cooldownEndsAtIso: string,
  nowMs: number = Date.now()
): string {
  const endsMs = new Date(cooldownEndsAtIso).getTime();
  const diffMs = endsMs - nowMs;

  if (diffMs <= 0) {
    return "Cooldown completed - Ready to apply";
  }

  const totalMin = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMin / 60);
  const min = totalMin % 60;

  if (hours > 0) {
    return `${hours}h ${min}m remaining`;
  }
  return `${min}m remaining`;
}

export const INITIAL_RECOVERY_CONTROLS: RecoveryControlItem[] = [
  {
    id: "secondary_signer",
    title: "Secondary Multi-Sig Signer",
    description: "Configured co-signing Stellar key authorized for account weight adjustments.",
    weight: 35,
    isConfigured: true,
    details: "Configured via Stellar Multi-Sig (Weight: 1)",
    configuredAt: "2026-10-12T14:30:00.000Z",
  },
  {
    id: "backup_email",
    title: "Encrypted Backup Notification Email",
    description: "Receives instant notifications upon any timelock initiation or security change.",
    weight: 20,
    isConfigured: true,
    details: "Verified (sec***@alphacap.io)",
    configuredAt: "2026-11-01T09:00:00.000Z",
  },
  {
    id: "hardware_key",
    title: "Hardware Security Key (FIDO2)",
    description: "Physical WebAuthn authenticator required to unlock settings updates.",
    weight: 25,
    isConfigured: false,
    details: "No physical key enrolled",
    configuredAt: null,
  },
  {
    id: "emergency_contact",
    title: "Designated Social Guardian Contact",
    description: "Trusted third-party institution authorized to co-sign recovery requests.",
    weight: 20,
    isConfigured: false,
    details: "Guardian unassigned",
    configuredAt: null,
  },
];
