"use client";

import { FeeTierDisplay } from "@/components/invoices/FeeTierDisplay";
import { useCampaignEligibility } from "@/hooks/useCampaignEligibility";
import { useFeeTier } from "@/hooks/useFeeTier";
import { useWallet } from "@/context/WalletContext";
import { discountedFee } from "@/lib/promotions";

/**
 * Original and discounted fee in invest/publish confirmations. When no offer
 * applies, the notice explains why instead of silently showing a discount.
 */
export function PromoFeeBreakdown({
  amount,
  loyalty,
}: {
  amount?: number | null;
  loyalty?: import("@/lib/api").InvestorLoyalty | null;
}) {
  const { address } = useWallet();
  const { campaign, eligible, reason } = useCampaignEligibility(address);
  const { data: feeTier } = useFeeTier();

  if (!feeTier) return null;

  if (!campaign || !eligible) {
    return (
      <div className="space-y-1" data-testid="promo-fee-notice">
        <FeeTierDisplay amount={amount} loyalty={loyalty} />
        <p className="text-xs text-muted-foreground">
          {reason === "budget-used"
            ? "Offer ended: the promotion budget is used. Standard fee applies."
            : reason === "ended"
              ? "Offer ended. Standard fee applies."
              : "No active fee promotion for this wallet. Standard fee applies."}
        </p>
      </div>
    );
  }

  const original = (feeTier.fee_percentage * (amount ?? 0)) / 100;
  const discounted = (discountedFee(feeTier.fee_percentage, campaign.discountPercentage) * (amount ?? 0)) / 100;

  return (
    <div className="space-y-2 text-xs" data-testid="promo-fee-breakdown">
      <FeeTierDisplay amount={amount} loyalty={loyalty} />
      <div className="flex justify-between">
        <span>Original fee ({feeTier.fee_percentage}%)</span>
        <span data-testid="promo-original-fee">{original.toLocaleString(undefined, { maximumFractionDigits: 7 })} XLM</span>
      </div>
      <div className="flex justify-between font-medium">
        <span>Discounted fee ({campaign.discountPercentage}% off)</span>
        <span data-testid="promo-discounted-fee">{discounted.toLocaleString(undefined, { maximumFractionDigits: 7 })} XLM</span>
      </div>
      <p className="text-muted-foreground">Applies to {campaign.title} while the offer is active.</p>
    </div>
  );
}
