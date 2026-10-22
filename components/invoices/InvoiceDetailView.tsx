"use client";

/**
 * Invoice detail page (issue #376)
 *
 * The canonical view of a single invoice: issuer, financials, funding
 * progress, documents and the invest CTA. The invest CTA is only offered to
 * KYC-approved wallets, and an unknown invoice ID renders a not-found state
 * instead of an error.
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { FileQuestion, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DaysRemainingBadge } from "@/components/invoices/DaysRemaining";
import { FundingProgressBar } from "@/components/invoices/FundingProgressBar";
import { FundingThresholdWarningBadge } from "@/components/invoices/FundingThresholdWarningBadge";
import { FundingFailedCard } from "@/components/invoices/FundingFailedCard";
import { SecondaryMarketTabsPanel } from "@/components/invoices/SecondaryMarketTabsPanel";
import { DefaultResolutionView } from "@/components/invoices/DefaultResolutionView";
import { InvoiceBackButton } from "@/components/invoices/InvoiceBackButton";
import { InvoiceDocumentsTab } from "@/components/invoices/InvoiceDocumentsTab";
import { InvoiceFinancials } from "@/components/invoices/InvoiceFinancials";
import { InvoiceMaturitySection } from "@/components/invoices/InvoiceMaturitySection";
import { InvoiceMetaTags } from "@/components/invoices/InvoiceMetaTags";
import { InvestorSocialProof } from "@/components/invoices/InvestorSocialProof";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { InvestmentModal } from "@/components/invoices/InvestmentModal";
import { InvoiceRatingWidget } from "@/components/invoices/InvoiceRatingWidget";
import { ReturnsBreakdown } from "@/components/invoices/ReturnsBreakdown";
import { SettlementTimeline } from "@/components/invoices/SettlementTimeline";
import { ShareInvoiceButton } from "@/components/invoices/ShareInvoiceButton";
import { WatchlistButton } from "@/components/invoices/WatchlistButton";
import { useIsKycApproved } from "@/hooks/useKycStatus";
import { useInvoiceStatusPolling } from "@/hooks/useInvoiceStatusPolling";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useProtocolStatus } from "@/hooks/useProtocolStatus";
import { useWallet } from "@/context/WalletContext";
import { isExpired } from "@/components/marketplace";
import { OrderBookDepthChart } from "@/components/marketplace/OrderBookDepthChart";
import { InvestorDemandMetrics } from "@/components/marketplace/InvestorDemandMetrics";
import { InvoiceClassificationBadges } from "@/components/marketplace/InvoiceClassificationBadges";
import { InvoiceTagPills } from "@/components/marketplace/InvoiceTagPills";
import { SettlementCountdown } from "@/components/marketplace/SettlementCountdown";
import { AnnouncementFeed } from "@/components/invoices/AnnouncementFeed";
import { SyndicatePanel } from "@/components/invoices/SyndicatePanel";
import { InvoiceFraudReport, InvoiceUnderReviewBanner } from "@/components/invoices/InvoiceFraudReport";
import { InvoiceRiskAlert } from "@/components/invoices/InvoiceRiskAlert";
import { InvoiceBenchmarkCard } from "@/components/invoices/InvoiceBenchmarkCard";
import { InvoiceNavPanel } from "@/components/invoices/InvoiceNavPanel";
import { truncateAddress } from "@/lib/stellar";
import { DEFAULT_MIN_INVESTMENT } from "@/lib/invoiceDefaults";
import { Money } from "@/components/currency";
import { CurrencyToggle } from "@/components/layout/CurrencyToggle";

function InvoiceDetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" data-testid="invoice-detail-loading">
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-72" />
          <Skeleton className="mt-2 h-4 w-48" />
        </CardHeader>
      </Card>
      <Card>
        <CardContent className="grid grid-cols-2 gap-4 pt-6 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-28" />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 pt-6">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

/** Rendered for an invoice ID the API does not know about. */
export function InvoiceNotFound({ invoiceId }: { invoiceId: string }) {
  return (
    <div
      className="rounded-xl border border-dashed p-12 text-center"
      data-testid="invoice-not-found"
      role="alert"
    >
      <FileQuestion className="mx-auto h-10 w-10 text-muted-foreground" />
      <h1 className="mt-4 text-xl font-semibold">Invoice not found</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        We could not find invoice{" "}
        <span className="font-mono" data-testid="invoice-not-found-id">
          {invoiceId}
        </span>
        . It may have been removed, or the link may be incorrect.
      </p>
      <Button asChild className="mt-6">
        <Link href="/marketplace">Back to marketplace</Link>
      </Button>
    </div>
  );
}

/**
 * The invest CTA. Hidden outright for wallets that have not passed KYC —
 * showing a button that always fails is worse than not offering it.
 *
 * The NAV panel sits inside this card for every branch (#546): fair value
 * against the market price is public information, so it is shown whether or
 * not this particular wallet is allowed to invest.
 */
function InvestCallToAction({
  invoiceId,
  issuerWallet,
  minInvestment,
  maxInvestment,
  fundingCap,
  yieldPercentage,
  maturityDate,
  fractionPrice,
}: {
  invoiceId: string;
  issuerWallet: string;
  minInvestment: number;
  maxInvestment: number;
  fundingCap: number;
  yieldPercentage?: number | null;
  maturityDate: string;
  fractionPrice?: number;
}) {
  const { isConnected } = useWallet();
  const { isApproved, isLoading, status } = useIsKycApproved({
    enabled: isConnected,
  });

  let body: ReactNode;

  if (!isConnected) {
    body = (
      <p className="text-sm text-muted-foreground">
        Connect a wallet to invest in this invoice.
      </p>
    );
  } else if (isLoading) {
    body = <Skeleton className="h-9 w-32" data-testid="invest-cta-loading" />;
  } else if (!isApproved) {
    body = (
      <div>
        <p
          className="flex items-center gap-2 text-sm text-muted-foreground"
          data-testid="invest-hidden-not-approved"
        >
          <ShieldAlert className="h-4 w-4" />
          Investing is available once your KYC is approved.
        </p>
        <p className="mt-1 text-xs text-muted-foreground" data-testid="kyc-status">
          Current KYC status: {status ?? "unknown"}
        </p>
        <Button asChild variant="outline" size="sm" className="mt-3">
          <Link href="/kyc/status">View KYC status</Link>
        </Button>
      </div>
    );
  } else {
    body = (
      <>
        <InvestmentModal
          invoiceId={invoiceId}
          issuerWallet={issuerWallet}
          minInvestment={minInvestment}
          maxInvestment={maxInvestment}
          fundingCap={fundingCap}
          yieldPercentage={yieldPercentage}
          maturityDate={maturityDate}
          fractionPrice={fractionPrice}
        />
      </>
    );
  }

  return (
    <Card data-testid="invest-cta">
      <CardContent className="pt-6 space-y-4">
        <InvoiceNavPanel invoiceId={invoiceId} fractionPrice={fractionPrice} />
        {body}
      </CardContent>
    </Card>
  );
}

export interface InvoiceDetailViewProps {
  invoiceId: string;
}

export function InvoiceDetailView({ invoiceId }: InvoiceDetailViewProps) {
  const { data: invoice, isLoading, isError, isFetching } = useInvoiceStatusPolling({
    invoiceId,
  });
  const { data: protocolStatus } = useProtocolStatus();
  const { address } = useWallet();

  // The floor is a per-invoice setting from invoice API (#436), falling back to protocol-wide setting.
  const minInvestment = invoice?.min_investment ?? protocolStatus?.min_investment ?? DEFAULT_MIN_INVESTMENT;

  usePageTitle(invoice?.title ?? null);

  if (isLoading) return <InvoiceDetailSkeleton />;

  if (isError || !invoice) return <InvoiceNotFound invoiceId={invoiceId} />;

  const expired = isExpired(invoice.due_date);
  const remaining = Math.max(0, invoice.amount - invoice.raised);
  const isOpenForInvestment = invoice.status === "open" && !expired && remaining > 0;
  // Qualifying investor: connected wallet appears in the investor list (#348).
  const isQualifyingInvestor = Boolean(
    address && invoice.investors.some((inv) => inv.address === address)
  );

  return (
    <div className="space-y-6">
      <InvoiceMetaTags
        title={invoice.title}
        status={invoice.status}
        amount={invoice.amount}
        invoiceId={invoice.id}
        investorCount={invoice.investor_count}
      />

      {/* Defaulted invoices: replace normal header with the default resolution
          status view which shows the declaration, collateral, recovery, and
          per-holder receipt (#483). */}
      {invoice.status === "defaulted" ? (
        <>
          <Card data-testid="invoice-detail-header">
            <CardHeader>
              <div className="flex min-w-0 items-center gap-2">
                <InvoiceBackButton />
                <div className="min-w-0">
                  <h1 className="truncate text-2xl font-bold" data-testid="invoice-title">
                    {invoice.title}
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground" data-testid="invoice-issuer">
                    Issuer:{" "}
                    <Link
                      href={`/issuers/${encodeURIComponent(invoice.seller)}`}
                      className="font-mono hover:underline"
                    >
                      {truncateAddress(invoice.seller)}
                    </Link>
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>
          <DefaultResolutionView invoiceId={invoice.id} connectedAddress={address} />
        </>
      ) : (
        /* Normal header: title, issuer, status and time left to fund. */
        <Card data-testid="invoice-detail-header">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <InvoiceBackButton />
                <div className="min-w-0">
                  <h1 className="truncate text-2xl font-bold" data-testid="invoice-title">
                    {invoice.title}
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground" data-testid="invoice-issuer">
                    Issuer:{" "}
                    {/* The seller address doubles as the issuer id, so the public
                        issuer profile (#400) is reachable from every invoice. */}
                    <Link
                      href={`/issuers/${encodeURIComponent(invoice.seller)}`}
                      data-testid="issuer-profile-link"
                      className="font-mono hover:underline"
                    >
                      {truncateAddress(invoice.seller)}
                    </Link>
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <CurrencyToggle showRate={false} />
                <InvoiceStatusBadge status={invoice.status} />
                <DaysRemainingBadge dueDate={invoice.due_date} status={invoice.status} />
                <WatchlistButton invoiceId={invoice.id} />
                <ShareInvoiceButton invoiceId={invoice.id} title={invoice.title} />
                <InvoiceFraudReport invoiceId={invoice.id} isInvestor={isQualifyingInvestor} />
              </div>
            </div>
            {invoice.description && (
              <p className="pt-2 text-sm text-muted-foreground" data-testid="invoice-description">
                {invoice.description}
              </p>
            )}
          </CardHeader>
        </Card>
      )}

      <InvoiceRiskAlert invoiceId={invoice.id} />
      <InvoiceUnderReviewBanner invoiceId={invoice.id} />

      <InvoiceFinancials
        faceValue={invoice.amount}
        yieldPercentage={invoice.yield_percentage}
        maturityDate={invoice.due_date}
        minInvestment={minInvestment}
      />

      {/* Repayment ledger (#478): interim instalments and the final settlement,
          shown once the invoice has been funded. */}
      {(invoice.status === "funded" || invoice.status === "settled") && (
        <SettlementTimeline
          invoiceId={invoice.id}
          totalDue={invoice.amount}
          isSettled={invoice.status === "settled"}
        />
      )}

      <InvoiceBenchmarkCard invoiceId={invoice.id} />

      {invoice.status === "funded" && (
        <InvoiceMaturitySection
          invoiceId={invoice.id}
          maturityDate={invoice.maturity_date}
          faceValue={invoice.amount}
          latePenaltyAccrued={invoice.late_penalty_accrued}
        />
      )}

      {/*
        Demand signals (#422) and the maturity countdown (#423) sit directly
        under the financials: both answer "how much interest is this getting"
        and "when do I get paid", which is what the headline numbers are for.
      */}
      <Card data-testid="invoice-demand-card">
        <CardContent className="pt-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-muted-foreground">Demand</p>
            <InvestorDemandMetrics
              invoiceId={invoice.id}
              investorCountFallback={invoice.investor_count}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-muted-foreground">
              Time to maturity
            </p>
            <SettlementCountdown
              maturityDate={invoice.due_date}
              settledAt={invoice.settled_at}
              variant="detail"
              labelled
            />
          </div>
          <InvoiceClassificationBadges invoice={invoice} />
          <InvoiceTagPills invoice={invoice} />
        </CardContent>
      </Card>

      {/* Funding progress: amount raised against the cap, with the minimum
          threshold marked when the invoice has one (#462).
          A FundingFailedCard replaces the bar for invoices where the threshold
          was missed (#481). */}
      {invoice.status === "rejected" &&
      invoice.min_funding_threshold != null &&
      invoice.raised < invoice.min_funding_threshold ? (
        <FundingFailedCard
          raised={invoice.raised}
          minThreshold={invoice.min_funding_threshold}
          closedAt={invoice.due_date}
        />
      ) : (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Funding progress</h2>
          </CardHeader>
          <CardContent>
            <FundingProgressBar
              raised={invoice.raised}
              target={invoice.max_funding_cap ?? invoice.amount}
              minThreshold={invoice.min_funding_threshold}
              investorCount={invoice.investor_count}
            />
            {/* Threshold warning badge: only visible within 24h of close (#481) */}
            {invoice.status === "open" && (
              <div className="mt-3">
                <FundingThresholdWarningBadge
                  raised={invoice.raised}
                  target={invoice.max_funding_cap ?? invoice.amount}
                  minThreshold={invoice.min_funding_threshold}
                  hoursUntilClose={
                    invoice.due_date
                      ? Math.max(
                          0,
                          (new Date(invoice.due_date).getTime() - Date.now()) /
                            (1000 * 60 * 60)
                        )
                      : null
                  }
                />
              </div>
            )}
            <div className="mt-3">
              <InvestorSocialProof count={invoice.investor_count} />
            </div>
            {isFetching && (
              <p className="mt-2 text-xs text-muted-foreground" data-testid="invoice-refreshing">
                Refreshing…
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <OrderBookDepthChart invoiceId={invoice.id} />

      {/* Invest CTA — KYC gated. */}
      {isOpenForInvestment ? (
        <InvestCallToAction
          invoiceId={invoice.id}
          issuerWallet={invoice.seller}
          minInvestment={minInvestment}
          maxInvestment={remaining}
          fundingCap={invoice.amount}
          yieldPercentage={invoice.yield_percentage}
          maturityDate={invoice.maturity_date ?? invoice.due_date}
          fractionPrice={invoice.fraction_price}
        />
      ) : (
        <Card data-testid="invest-cta">
          <CardContent className="pt-6 space-y-4">
            {/* The NAV comparison still applies once the primary market has
                closed: funded invoices trade on the secondary market (#546). */}
            <InvoiceNavPanel invoiceId={invoice.id} fractionPrice={invoice.fraction_price} />
            <p className="text-sm text-muted-foreground" data-testid="invest-unavailable">
              {invoice.status === "settled"
                ? "This invoice has been settled and is no longer open for investment."
                : invoice.status === "funded"
                  ? "This invoice has reached its funding target."
                  : invoice.status === "rejected"
                    ? "This invoice was rejected during review."
                    : invoice.status === "draft"
                      ? "This invoice has not been published yet."
                      : "This invoice is no longer accepting investments."}
            </p>
          </CardContent>
        </Card>
      )}

      <SyndicatePanel invoiceId={invoice.id} />

      <AnnouncementFeed invoiceId={invoice.id} />

      <InvoiceDocumentsTab
        invoiceId={invoice.id}
        documentUrl={invoice.document_url ?? null}
        additionalDocuments={invoice.documents ?? []}
      />

      <InvoiceRatingWidget
        invoiceId={invoice.id}
        isEligible={isQualifyingInvestor}
        walletAddress={address}
      />

      {invoice.investors.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Investors</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {invoice.investors.map((investor) => (
              <div
                key={investor.address}
                className="flex items-center justify-between"
                data-testid={`investor-${investor.address}`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary font-mono text-xs">
                    {investor.address.slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-mono text-sm">{truncateAddress(investor.address)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(investor.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-medium"><Money xlm={investor.amount} xlmText={`${investor.amount.toLocaleString()} XLM`} /></p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {(invoice.status === "settled" || invoice.status === "funded") && (
        <ReturnsBreakdown invoiceId={invoice.id} />
      )}

      {/* Secondary market: Buy Now + Limit Order tabs (#480).
          Only shown for funded invoices — the primary market is still active
          for open invoices. */}
      {invoice.status === "funded" && (
        <SecondaryMarketTabsPanel invoiceId={invoice.id} walletAddress={address} />
      )}
    </div>
  );
}
