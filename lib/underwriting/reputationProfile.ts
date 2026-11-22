/**
 * Underwriter reputation and capacity profiles (#685)
 *
 * Implements track-record metrics, capacity reconciliation between active
 * and reserved cover, slashing event audit logs, privacy sanitation, and
 * follow preference persistence for underwriters.
 */

export type InvoiceStatus = "settled" | "defaulted" | "active";

export interface InvoiceHistoryRecord {
  id: string;
  invoiceId: string;
  amount: number;
  status: InvoiceStatus;
  settledAt?: string | null;
  defaultedAt?: string | null;
  dueDate?: string;
  lossAmount?: number;
}

export interface SlashingEvent {
  id: string;
  timestamp: string;
  reason: string;
  amount: number;
  txHash: string;
}

export interface ConfidenceRange {
  min: number;
  max: number;
}

export interface ReputationMetrics {
  score: number | null; // 0-100 or null if sampleCount === 0
  sampleCount: number; // completed evaluations (settled + defaulted)
  settledCount: number;
  defaultedCount: number;
  activeCount: number;
  confidenceRange: ConfidenceRange;
}

export interface CapacityReconciliation {
  totalCapacity: number;
  activeCover: number;
  reservedCover: number;
  availableCapacity: number;
  utilizationRate: number; // percentage 0 - 100+
  isExhausted: boolean;
  isOverallocated: boolean;
}

export interface UnderwriterProfile {
  id: string;
  name: string;
  address: string;
  totalCapacity: number;
  activeCover: number;
  reservedCover: number;
  totalLosses: number;
  totalStaked: number;
  slashingHistory: SlashingEvent[];
  invoiceHistory: InvoiceHistoryRecord[];
  isFollowed?: boolean;
  reputation?: ReputationMetrics;
  capacity?: CapacityReconciliation;
}

export type ReputationTierId = "unrated" | "bronze" | "silver" | "gold" | "platinum";

export interface ReputationTier {
  id: ReputationTierId;
  label: string;
  min: number;
  max: number;
  className: string;
}

export const UNDERWRITER_REPUTATION_TIERS: ReputationTier[] = [
  {
    id: "bronze",
    label: "Bronze",
    min: 0,
    max: 39,
    className: "border-orange-300 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-200",
  },
  {
    id: "silver",
    label: "Silver",
    min: 40,
    max: 59,
    className: "border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100",
  },
  {
    id: "gold",
    label: "Gold",
    min: 60,
    max: 79,
    className: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200",
  },
  {
    id: "platinum",
    label: "Platinum",
    min: 80,
    max: 100,
    className: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200",
  },
];

export const UNRATED_UNDERWRITER_TIER: ReputationTier = {
  id: "unrated",
  label: "Unrated",
  min: 0,
  max: 0,
  className: "border-border bg-muted text-muted-foreground",
};

export function getUnderwriterTier(score: number | null | undefined): ReputationTier {
  if (score === null || score === undefined || Number.isNaN(score)) {
    return UNRATED_UNDERWRITER_TIER;
  }
  const rounded = Math.round(Math.min(100, Math.max(0, score)));
  return (
    UNDERWRITER_REPUTATION_TIERS.find((t) => rounded >= t.min && rounded <= t.max) ??
    UNDERWRITER_REPUTATION_TIERS[UNDERWRITER_REPUTATION_TIERS.length - 1]
  );
}

/**
 * Calculates underwriter reputation metrics based on invoice track record.
 * Uses a 95% Wilson score interval to calculate the confidence range based on sample size.
 */
export function calculateReputation(history: InvoiceHistoryRecord[] = []): ReputationMetrics {
  if (!Array.isArray(history) || history.length === 0) {
    return {
      score: null,
      sampleCount: 0,
      settledCount: 0,
      defaultedCount: 0,
      activeCount: 0,
      confidenceRange: { min: 0, max: 100 },
    };
  }

  let settledCount = 0;
  let defaultedCount = 0;
  let activeCount = 0;

  for (const record of history) {
    if (record?.status === "settled") settledCount++;
    else if (record?.status === "defaulted") defaultedCount++;
    else if (record?.status === "active") activeCount++;
  }

  const sampleCount = settledCount + defaultedCount;

  if (sampleCount === 0) {
    return {
      score: null,
      sampleCount: 0,
      settledCount,
      defaultedCount,
      activeCount,
      confidenceRange: { min: 0, max: 100 },
    };
  }

  const p = settledCount / sampleCount;
  const score = Math.round(p * 100);

  // Wilson score interval (z = 1.96 for 95% confidence)
  const z = 1.96;
  const z2 = z * z;
  const denom = 1 + z2 / sampleCount;
  const center = (p + z2 / (2 * sampleCount)) / denom;
  const spread =
    (z * Math.sqrt((p * (1 - p)) / sampleCount + z2 / (4 * sampleCount * sampleCount))) / denom;

  const min = Math.max(0, Math.round((center - spread) * 100));
  const max = Math.min(100, Math.round((center + spread) * 100));

  return {
    score,
    sampleCount,
    settledCount,
    defaultedCount,
    activeCount,
    confidenceRange: { min, max },
  };
}

/**
 * Reconciles an underwriter's total capacity against active and reserved cover.
 */
export function reconcileCapacity(
  totalCapacity: number,
  activeCover: number,
  reservedCover: number
): CapacityReconciliation {
  const safeTotal = Math.max(0, Number.isFinite(totalCapacity) ? totalCapacity : 0);
  const safeActive = Math.max(0, Number.isFinite(activeCover) ? activeCover : 0);
  const safeReserved = Math.max(0, Number.isFinite(reservedCover) ? reservedCover : 0);

  const committedCover = safeActive + safeReserved;
  const availableCapacity = Math.max(0, safeTotal - committedCover);
  const isOverallocated = committedCover > safeTotal;
  const isExhausted = availableCapacity <= 0;

  let utilizationRate = 0;
  if (safeTotal > 0) {
    utilizationRate = Math.round((committedCover / safeTotal) * 10000) / 100;
  } else if (committedCover > 0) {
    utilizationRate = 100;
  }

  return {
    totalCapacity: safeTotal,
    activeCover: safeActive,
    reservedCover: safeReserved,
    availableCapacity,
    utilizationRate,
    isExhausted,
    isOverallocated,
  };
}

/**
 * Storage key for persisting followed underwriters in localStorage.
 */
export const UNDERWRITER_FOLLOW_STORAGE_KEY = "stellarsettle.underwriter_follows";

export function getFollowedUnderwriters(): string[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(UNDERWRITER_FOLLOW_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function isUnderwriterFollowed(underwriterId: string): boolean {
  if (!underwriterId) return false;
  const follows = getFollowedUnderwriters();
  return follows.includes(underwriterId);
}

export function toggleFollowUnderwriter(
  underwriterId: string,
  isFollowed?: boolean
): boolean {
  if (!underwriterId) return false;
  const currentFollows = new Set(getFollowedUnderwriters());
  const targetState = isFollowed !== undefined ? isFollowed : !currentFollows.has(underwriterId);

  if (targetState) {
    currentFollows.add(underwriterId);
  } else {
    currentFollows.delete(underwriterId);
  }

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem(
        UNDERWRITER_FOLLOW_STORAGE_KEY,
        JSON.stringify(Array.from(currentFollows))
      );
    } catch {
      // Ignore storage errors in private browsing
    }
  }

  return targetState;
}

/** List of private fields that must never be exposed */
const PRIVATE_FIELD_PATTERNS = [
  "secret",
  "private",
  "seed",
  "mnemonic",
  "token",
  "password",
  "pin",
  "ssn",
  "taxid",
  "apikey",
  "internalnotes",
];

function isPrivateField(key: string): boolean {
  const lower = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  return PRIVATE_FIELD_PATTERNS.some((pattern) => lower.includes(pattern));
}

/**
 * Sanitizes an underwriter profile to strictly exclude private wallet data,
 * private memos, and secret keys while calculating reputation and capacity.
 */
export function sanitizeUnderwriterProfile(raw: unknown): UnderwriterProfile {
  if (!raw || typeof raw !== "object") {
    return {
      id: "unknown",
      name: "Anonymous Underwriter",
      address: "",
      totalCapacity: 0,
      activeCover: 0,
      reservedCover: 0,
      totalLosses: 0,
      totalStaked: 0,
      slashingHistory: [],
      invoiceHistory: [],
      isFollowed: false,
      reputation: calculateReputation([]),
      capacity: reconcileCapacity(0, 0, 0),
    };
  }

  const input = raw as Record<string, unknown>;

  // Clean and validate address:
  let address = typeof input.address === "string" ? input.address.trim() : "";
  // Stellar secret seeds start with 'S' and are 56 chars. Mask immediately if encountered.
  if (address.startsWith("S") && address.length >= 50) {
    address = "G[REDACTED_SECRET_SEED]";
  }

  // Clean name
  let name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) {
    name = address ? `${address.slice(0, 4)}...${address.slice(-4)}` : "Anonymous Underwriter";
  }

  const id = typeof input.id === "string" && input.id.trim() ? input.id.trim() : address || "unknown";

  const totalCapacity = Number.isFinite(input.totalCapacity) ? Math.max(0, Number(input.totalCapacity)) : 0;
  const activeCover = Number.isFinite(input.activeCover) ? Math.max(0, Number(input.activeCover)) : 0;
  const reservedCover = Number.isFinite(input.reservedCover) ? Math.max(0, Number(input.reservedCover)) : 0;
  const totalLosses = Number.isFinite(input.totalLosses) ? Math.max(0, Number(input.totalLosses)) : 0;
  const totalStaked = Number.isFinite(input.totalStaked) ? Math.max(0, Number(input.totalStaked)) : 0;

  // Sanitize slashing history
  const slashingHistory: SlashingEvent[] = [];
  if (Array.isArray(input.slashingHistory)) {
    for (const event of input.slashingHistory) {
      if (event && typeof event === "object") {
        const e = event as Record<string, unknown>;
        slashingHistory.push({
          id: String(e.id || Math.random().toString(36).slice(2)),
          timestamp: typeof e.timestamp === "string" ? e.timestamp : new Date().toISOString(),
          reason: typeof e.reason === "string" ? e.reason.trim() : "Collateral liquidation",
          amount: Number.isFinite(e.amount) ? Math.max(0, Number(e.amount)) : 0,
          txHash: typeof e.txHash === "string" ? e.txHash.trim() : "",
        });
      }
    }
  }

  // Sanitize invoice history
  const invoiceHistory: InvoiceHistoryRecord[] = [];
  if (Array.isArray(input.invoiceHistory)) {
    for (const item of input.invoiceHistory) {
      if (item && typeof item === "object") {
        const inv = item as Record<string, unknown>;
        const status =
          inv.status === "settled" || inv.status === "defaulted" || inv.status === "active"
            ? inv.status
            : "active";

        invoiceHistory.push({
          id: String(inv.id || Math.random().toString(36).slice(2)),
          invoiceId: String(inv.invoiceId || ""),
          amount: Number.isFinite(inv.amount) ? Math.max(0, Number(inv.amount)) : 0,
          status,
          settledAt: typeof inv.settledAt === "string" ? inv.settledAt : null,
          defaultedAt: typeof inv.defaultedAt === "string" ? inv.defaultedAt : null,
          dueDate: typeof inv.dueDate === "string" ? inv.dueDate : undefined,
          lossAmount: Number.isFinite(inv.lossAmount) ? Math.max(0, Number(inv.lossAmount)) : 0,
        });
      }
    }
  }

  const reputation = calculateReputation(invoiceHistory);
  const capacity = reconcileCapacity(totalCapacity, activeCover, reservedCover);
  const isFollowed = isUnderwriterFollowed(id);

  // Return strictly typed profile with all private keys excluded
  const cleanProfile: UnderwriterProfile = {
    id,
    name,
    address,
    totalCapacity,
    activeCover,
    reservedCover,
    totalLosses,
    totalStaked,
    slashingHistory,
    invoiceHistory,
    isFollowed,
    reputation,
    capacity,
  };

  // Double check that no private properties slipped through
  for (const key of Object.keys(input)) {
    if (isPrivateField(key) && key in cleanProfile) {
      delete (cleanProfile as unknown as Record<string, unknown>)[key];
    }
  }

  return cleanProfile;
}

/**
 * Truncates an address or transaction hash for safe, clean display.
 */
export function truncateAddress(address: string): string {
  if (!address) return "";
  if (address.length <= 8) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

/**
 * Sorts slashing events in reverse chronological order (newest first).
 */
export function sortSlashingHistory(events: SlashingEvent[] = []): SlashingEvent[] {
  return [...events].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime() || 0;
    const timeB = new Date(b.timestamp).getTime() || 0;
    return timeB - timeA;
  });
}
