/** Active fee-promotion campaigns (#600). */

import { API_BASE, asRecord, numberFrom, readJson, stringFrom } from "./shared";
import type { Campaign } from "@/lib/promotions";

function normalizeCampaign(payload: unknown): Campaign | null {
  const record = asRecord(payload);
  const id = stringFrom(record.id ?? record.campaign_id);
  if (!id) return null;

  return {
    id,
    title: stringFrom(record.title, "Fee promotion"),
    discountPercentage: numberFrom(record.discount_percentage ?? record.discountPercentage),
    startsAt: stringFrom(record.starts_at ?? record.startsAt),
    endsAt: stringFrom(record.ends_at ?? record.endsAt),
    remainingBudget: numberFrom(record.remaining_budget ?? record.remainingBudget),
    eligibility: stringFrom(record.eligibility, "All") === "Allowlist" ? "Allowlist" : "All",
    allowlist: Array.isArray(record.allowlist)
      ? record.allowlist.filter((entry): entry is string => typeof entry === "string")
      : [],
  };
}

/** Returns an empty list on failure so the marketplace never invents an offer. */
export async function fetchActiveCampaigns(): Promise<Campaign[]> {
  try {
    const res = await fetch(`${API_BASE}/campaigns/active`);
    if (!res.ok) return [];
    const payload = await readJson(res);
    const root = asRecord(payload);
    const rows = Array.isArray(root.campaigns)
      ? root.campaigns
      : Array.isArray(payload)
        ? payload
        : [];
    return rows.map(normalizeCampaign).filter((campaign): campaign is Campaign => campaign !== null);
  } catch {
    return [];
  }
}
