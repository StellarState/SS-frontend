/**
 * Fee promotion rules (#600).
 *
 * Pure helpers only: campaign selection, eligibility, discount maths and
 * dismissal persistence all stay testable without a React renderer. When the
 * backend response is missing or malformed the helpers return a degraded
 * result rather than inventing a campaign.
 */

export interface Campaign {
  id: string;
  title: string;
  discountPercentage: number;
  startsAt: string;
  endsAt: string;
  remainingBudget: number;
  eligibility: "All" | "Allowlist";
  allowlist: string[];
}

export type CampaignStatus = "active" | "ended" | "budget-used" | "upcoming";

export interface CampaignEligibility {
  campaign: Campaign | null;
  eligible: boolean;
  status: CampaignStatus;
  /** Why the wallet cannot use the offer, for user-facing notices. */
  reason: "ineligible" | "ended" | "budget-used" | "upcoming" | null;
}

export const PROMO_DISMISSAL_PREFIX = "ss:promo-dismissed:";

export function dismissalKey(campaignId: string): string {
  return `${PROMO_DISMISSAL_PREFIX}${campaignId}`;
}

export function isDismissed(campaignId: string, storage: Storage): boolean {
  try {
    return storage.getItem(dismissalKey(campaignId)) === "1";
  } catch {
    return false;
  }
}

export function dismissCampaign(campaignId: string, storage: Storage): void {
  try {
    storage.setItem(dismissalKey(campaignId), "1");
  } catch {
    // Storage can be disabled in private browsing; dismissal is cosmetic.
  }
}

export function campaignStatus(
  campaign: Campaign,
  now: number = Date.now()
): CampaignStatus {
  if (campaign.remainingBudget <= 0) return "budget-used";
  const start = new Date(campaign.startsAt).getTime();
  const end = new Date(campaign.endsAt).getTime();
  if (Number.isFinite(start) && now < start) return "upcoming";
  if (Number.isFinite(end) && now >= end) return "ended";
  return "active";
}

export function isWalletEligible(campaign: Campaign, wallet?: string | null): boolean {
  if (campaign.eligibility === "All") return true;
  if (!wallet) return false;
  const normalized = wallet.trim().toLowerCase();
  return campaign.allowlist.some((entry) => entry.trim().toLowerCase() === normalized);
}

/**
 * Best offer for a wallet: active, funded and eligible, highest discount wins.
 * Ties keep the earliest campaign id so the choice is deterministic.
 */
export function selectBestCampaign(
  campaigns: readonly Campaign[],
  wallet?: string | null,
  now: number = Date.now()
): Campaign | null {
  return campaigns
    .filter((campaign) => campaignStatus(campaign, now) === "active")
    .filter((campaign) => isWalletEligible(campaign, wallet))
    .sort((a, b) => b.discountPercentage - a.discountPercentage || a.id.localeCompare(b.id))[0] ?? null;
}

export function evaluateCampaign(
  campaigns: readonly Campaign[],
  wallet?: string | null,
  now: number = Date.now()
): CampaignEligibility {
  if (campaigns.length === 0) {
    return { campaign: null, eligible: false, status: "upcoming", reason: null };
  }

  const best = selectBestCampaign(campaigns, wallet, now);
  if (best) {
    return { campaign: best, eligible: true, status: "active", reason: null };
  }

  const active = campaigns.find((campaign) => campaignStatus(campaign, now) === "active");
  if (!active) {
    const ended = campaigns.some((campaign) => campaignStatus(campaign, now) === "ended");
    const exhausted = campaigns.some(
      (campaign) => campaignStatus(campaign, now) === "budget-used"
    );
    const status: CampaignStatus = ended ? "ended" : exhausted ? "budget-used" : "upcoming";
    return {
      campaign: null,
      eligible: false,
      status,
      reason: status,
    };
  }

  return {
    campaign: active,
    eligible: false,
    status: "active",
    reason: "ineligible",
  };
}

/** Discounted fee, never below zero. Rounding is left to the display layer. */
export function discountedFee(feePercentage: number, discountPercentage: number): number {
  const discount = Math.max(0, Math.min(100, discountPercentage));
  return Math.max(0, feePercentage * (1 - discount / 100));
}
