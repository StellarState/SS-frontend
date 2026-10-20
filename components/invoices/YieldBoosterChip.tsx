"use client";

import { TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/context/WalletContext";
import { useInvoiceYieldBoost } from "@/hooks/useInvoiceYieldBoost";
import {
  YIELD_BOOST_TIER_LABELS,
  formatYieldRate,
  getBoostAmount,
  isBoostEligible,
} from "@/lib/yieldBoost";

/**
 * Shows the yield boost a connected wallet is entitled to on an invoice:
 * the base yield, the boost tier and the boosted yield side by side.
 *
 * Renders nothing for wallets that are not eligible — unregistered wallets
 * and Bronze-tier wallets have no boost to show.
 */
export function YieldBoosterChip({ invoiceId }: { invoiceId: string }) {
  const { address } = useWallet();
  const { data: boost } = useInvoiceYieldBoost(invoiceId, address);

  if (!isBoostEligible(boost)) return null;

  const boostAmount = getBoostAmount(boost);

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950"
      data-testid="yield-booster-chip"
    >
      <TrendingUp className="h-4 w-4 text-green-700 dark:text-green-400" aria-hidden="true" />
      <span className="text-sm font-medium">Boosted Yield</span>
      <span className="text-sm text-muted-foreground">
        Base{" "}
        <span className="tabular-nums text-foreground" data-testid="yield-boost-base">
          {formatYieldRate(boost!.base_yield)}
        </span>
      </span>
      <span aria-hidden="true" className="text-muted-foreground">
        →
      </span>
      <span className="text-sm font-semibold tabular-nums" data-testid="yield-boost-boosted">
        {formatYieldRate(boost!.boosted_yield)}
      </span>
      <Badge variant="secondary" data-testid="yield-boost-tier">
        {YIELD_BOOST_TIER_LABELS[boost!.tier]}
      </Badge>
      <span className="sr-only" data-testid="yield-boost-amount">
        {`Boost of ${formatYieldRate(boostAmount)}`}
      </span>
    </div>
  );
}
