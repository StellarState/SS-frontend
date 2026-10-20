"use client";

import { TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/context/WalletContext";
import { useInvoiceYieldBoost } from "@/hooks/useInvoiceYieldBoost";
import {
  YIELD_BOOST_TIER_LABELS,
  formatYieldRate,
  isBoostEligible,
} from "@/lib/yieldBoost";

/**
 * Boosted-yield badge for a portfolio holding. Renders nothing when the
 * connected wallet has no boost on the invoice.
 */
export function PortfolioYieldBoostBadge({ invoiceId }: { invoiceId: string }) {
  const { address } = useWallet();
  const { data: boost } = useInvoiceYieldBoost(invoiceId, address);

  if (!isBoostEligible(boost)) return null;

  return (
    <Badge variant="secondary" data-testid={`yield-boost-badge-${invoiceId}`}>
      <TrendingUp aria-hidden="true" />
      {YIELD_BOOST_TIER_LABELS[boost!.tier]} · {formatYieldRate(boost!.boosted_yield)}
    </Badge>
  );
}
