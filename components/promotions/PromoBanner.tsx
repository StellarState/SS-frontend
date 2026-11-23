"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CampaignCountdown } from "@/components/promotions/CampaignCountdown";
import { useCampaignEligibility } from "@/hooks/useCampaignEligibility";
import { useWallet } from "@/context/WalletContext";
import { dismissCampaign, isDismissed } from "@/lib/promotions";

const STATUS_NOTICE = {
  ended: "This fee promotion has ended.",
  "budget-used": "This fee promotion has used its budget.",
  upcoming: "A fee promotion is starting soon.",
} as const;

/** Top-of-marketplace banner for the best offer available to this wallet. */
export function PromoBanner() {
  const { address } = useWallet();
  const { campaign, eligible, reason, isLoading } = useCampaignEligibility(address);
  const campaignId = campaign?.id;
  const [dismissedIds, setDismissedIds] = useState<readonly string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage;
    setDismissedIds((campaignId ? [campaignId] : []).filter((id) => isDismissed(id, stored)));
  }, [campaignId]);

  if (isLoading) return null;
  if (!campaign) {
    return reason && reason !== "ineligible" ? (
      <PromoStatusNotice status={reason} />
    ) : null;
  }
  if (dismissedIds.includes(campaign.id)) return null;

  if (!eligible) {
    return (
      <div className="mb-4 rounded-lg border bg-muted/40 px-4 py-3 text-sm" data-testid="promo-banner-ineligible">
        <p className="font-medium">Fee promotion available to selected wallets</p>
        <p className="text-muted-foreground">
          Your wallet is not on the allowlist for {campaign.title}.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-primary/5 px-4 py-3" data-testid="promo-banner">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge data-testid="promo-discount">{campaign.discountPercentage}% fee off</Badge>
          <span className="font-medium">{campaign.title}</span>
        </div>
        <p className="text-xs text-muted-foreground" data-testid="promo-budget">
          Remaining budget: {campaign.remainingBudget.toLocaleString()} XLM
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">Ends in</span>
        <CampaignCountdown endsAt={campaign.endsAt} />
        <Button
          variant="ghost"
          size="sm"
          aria-label="Dismiss promotion"
          data-testid="promo-dismiss"
          onClick={() => {
            if (typeof window === "undefined") return;
            dismissCampaign(campaign.id, window.localStorage);
            setDismissedIds((ids) => [...ids, campaign.id]);
          }}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}

/** Notice shown when no offer is available because the last one ended or ran out. */
export function PromoStatusNotice({ status }: { status: "ended" | "budget-used" | "upcoming" }) {
  return (
    <p className="mb-4 text-sm text-muted-foreground" data-testid="promo-status-notice">
      {STATUS_NOTICE[status]}
    </p>
  );
}
