import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FundingProgressBar } from "@/components/invoices/FundingProgressBar";
import { FundingThresholdWarningBadge } from "@/components/invoices/FundingThresholdWarningBadge";
import { CountdownTimer, isExpired } from "./countdown-timer";
import { InvoiceTagPills } from "./InvoiceTagPills";
import { InvoiceClassificationBadges } from "./InvoiceClassificationBadges";
import { CompareToggleButton } from "./CompareToggleButton";
import { SettlementCountdown } from "./SettlementCountdown";
import { InvestorDemandMetrics } from "./InvestorDemandMetrics";
import { useComparison } from "./InvoiceComparisonContext";
import { ShareInvoiceButton } from "@/components/invoices/ShareInvoiceButton";
import { StateChangeBadge } from "./StateChangeBadge";
import { WatchlistButton } from "./WatchlistButton";
import { BenchmarkChip } from "./BenchmarkChip";
import { NavChip } from "./NavChip";
import { Lock } from "lucide-react";
import type { Invoice } from "@/lib/api";
import type { WatchlistStateChange } from "@/lib/watchlist";
import { Money } from "@/components/currency";
import { useSuitabilityTier } from "@/hooks/useSuitabilityTier";
import { REQUIRED_TIER, TIER_LABELS, canInvestInGrade } from "@/lib/suitability";
import { InvoiceGreylistStatus } from "@/components/invoices/InvoiceGreylistStatus";
import { IssuerCreditTierBadge } from "@/components/issuers/IssuerCreditTierBadge";

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  open: "default",
  funded: "secondary",
  settled: "outline",
};

interface InvoiceCardProps {
  invoice: Invoice;
  onInvest?: (invoiceId: string) => void;
  /** Recent state transition to announce on the card (#474). */
  stateChange?: WatchlistStateChange | null;
  /** Hide the watch bell on surfaces where watching is not the point. */
  showWatchToggle?: boolean;
}

export function InvoiceCard({
  invoice,
  onInvest,
  stateChange = null,
  showWatchToggle = true,
}: InvoiceCardProps) {
  const published = invoice.status === "open";
  const expired = isExpired(invoice.due_date);
  const { tier } = useSuitabilityTier();
  const grade = invoice.risk_rating?.tier;
  const locked = !canInvestInGrade(tier, grade);

  // Compute hours remaining so the threshold warning badge knows whether to show.
  const hoursUntilClose =
    invoice.due_date
      ? Math.max(
          0,
          (new Date(invoice.due_date).getTime() - Date.now()) / (1000 * 60 * 60)
        )
      : null;

  return (
    <Card className="flex flex-col" data-testid={`invoice-card-${invoice.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <CardTitle className="line-clamp-1 text-base">
              {invoice.title}
            </CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><span>Issuer {invoice.seller.slice(0, 6)}…{invoice.seller.slice(-4)}</span><IssuerCreditTierBadge wallet={invoice.seller} /></div>
            {stateChange && <StateChangeBadge change={stateChange} />}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant={statusVariant[invoice.status]}>
              {invoice.status}
            </Badge>
            {showWatchToggle && <WatchlistButton invoiceId={invoice.id} />}
          </div>
        </div>
        <InvoiceClassificationBadges invoice={invoice} />
        <InvoiceGreylistStatus greylist={invoice.greylist} compact />
        <InvoiceTagPills invoice={invoice} />
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">
            <Money xlm={invoice.amount} xlmText={`${invoice.amount.toLocaleString()} XLM`} />
          </span>
          <CountdownTimer deadline={invoice.due_date} published={published} />
        </div>

        {invoice.yield_percentage !== undefined && (
          <div className="flex flex-col items-start gap-1" data-testid="invoice-card-yield">
            <span className="text-sm text-muted-foreground">
              Yield{" "}
              <span className="font-medium text-foreground">{invoice.yield_percentage}%</span>
            </span>
            <BenchmarkChip invoice={invoice} />
          </div>
        )}

        {/* Fair value against the market price (#546). The chip hides itself
            when the invoice has no NAV, so it is safe to always render. */}
        <NavChip invoiceId={invoice.id} fractionPrice={invoice.fraction_price} />

        <FundingProgressBar
          raised={invoice.raised}
          target={invoice.max_funding_cap ?? invoice.amount}
          minThreshold={invoice.min_funding_threshold}
          investorCount={invoice.investor_count}
        />

        {/* Threshold warning: visible when closing within 24h and min threshold unmet (#481) */}
        {published && !expired && (
          <FundingThresholdWarningBadge
            raised={invoice.raised}
            target={invoice.max_funding_cap ?? invoice.amount}
            minThreshold={invoice.min_funding_threshold}
            hoursUntilClose={hoursUntilClose}
          />
        )}

        {/*
          Maturity countdown (#423) and demand signals (#422). The funding
          countdown above tracks the *funding* deadline, which only applies
          while an invoice is open; this one tracks payout, which applies to
          funded and settled invoices alike.
        */}
        <div className="flex items-center justify-between gap-2">
          <SettlementCountdown
            maturityDate={invoice.due_date}
            settledAt={invoice.status === "settled" ? invoice.settled_at : null}
          />
          <InvestorDemandMetrics
            invoiceId={invoice.id}
            investorCountFallback={invoice.investor_count}
          />
        </div>

        {grade && (
          <p className="text-xs text-muted-foreground">Risk grade {grade}</p>
        )}
        {locked && grade && (
          <p className="flex items-center gap-1 text-xs text-amber-700" data-testid="suitability-lock">
            <Lock className="h-3 w-3" aria-hidden="true" />
            Requires risk profile: {TIER_LABELS[REQUIRED_TIER[grade]]} or higher
          </p>
        )}

        <div className="flex gap-2 mt-auto">
          <Button
            className="flex-1"
            disabled={!published || expired || locked || Boolean(invoice.greylist && (!invoice.greylist.clears_at || new Date(invoice.greylist.clears_at).getTime() > Date.now()))}
            onClick={() => onInvest?.(invoice.id)}
          >
            {expired ? "Expired" : locked ? "Locked" : "Invest"}
          </Button>
          <ShareInvoiceButton invoiceId={invoice.id} title={invoice.title} />
          <CompareToggleButton invoice={invoice} />
        </div>
      </CardContent>
    </Card>
  );
}
