import { describe, expect, it } from "vitest";
import {
  campaignStatus,
  dismissCampaign,
  discountedFee,
  evaluateCampaign,
  isDismissed,
  selectBestCampaign,
  type Campaign,
} from "../promotions";
import { dismissalKey } from "../promotions";

const NOW = new Date("2026-11-21T12:00:00.000Z").getTime();

function campaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: "campaign-1",
    title: "Wave promo",
    discountPercentage: 20,
    startsAt: "2026-11-20T00:00:00.000Z",
    endsAt: "2026-11-22T00:00:00.000Z",
    remainingBudget: 1000,
    eligibility: "All",
    allowlist: [],
    ...overrides,
  };
}

describe("fee promotions", () => {
  it("selects the best eligible active campaign", () => {
    const best = selectBestCampaign(
      [
        campaign({ id: "small", discountPercentage: 10 }),
        campaign({ id: "large", discountPercentage: 30 }),
      ],
      "GABC...123",
      NOW
    );
    expect(best?.id).toBe("large");
  });

  it("marks allowlist campaigns ineligible for other wallets", () => {
    const allowlisted = campaign({
      eligibility: "Allowlist",
      allowlist: [" GABC...123 "],
    });
    expect(evaluateCampaign([allowlisted], "GABC...123", NOW)).toMatchObject({
      eligible: true,
      status: "active",
      reason: null,
    });
    expect(evaluateCampaign([allowlisted], "GOTHER...999", NOW)).toMatchObject({
      eligible: false,
      status: "active",
      reason: "ineligible",
    });
  });

  it("removes ended and exhausted offers", () => {
    expect(
      evaluateCampaign([campaign({ endsAt: "2026-11-21T11:00:00.000Z" })], null, NOW).reason
    ).toBe("ended");
    expect(evaluateCampaign([campaign({ remainingBudget: 0 })], null, NOW).reason).toBe(
      "budget-used"
    );
    expect(campaignStatus(campaign({ startsAt: "2026-11-22T00:00:00.000Z" }), NOW)).toBe(
      "upcoming"
    );
  });

  it("never discounts more than 100 percent and never returns a negative fee", () => {
    expect(discountedFee(5, 150)).toBe(0);
    expect(discountedFee(10, 25)).toBe(7.5);
  });

  it("persists dismissal per campaign without affecting another campaign", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
      key: (index: number) => [...store.keys()][index] ?? null,
      get length() {
        return store.size;
      },
    } as Storage;

    dismissCampaign("campaign-a", storage);
    expect(isDismissed("campaign-a", storage)).toBe(true);
    expect(isDismissed("campaign-b", storage)).toBe(false);
    expect(store.has(dismissalKey("campaign-a"))).toBe(true);
  });
});
