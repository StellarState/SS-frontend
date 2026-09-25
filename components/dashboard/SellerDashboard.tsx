"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileStatsSkeleton } from "@/components/ui/skeletons";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { FundingProgressBar } from "@/components/invoices/FundingProgressBar";
import { KycStatusBanner } from "@/components/dashboard/KycStatusBanner";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import {
  useSellerDashboard,
  useSellerKycStatus,
} from "@/hooks/useSellerDashboard";
import { useStellarWallet } from "@/hooks/useStellarWallet";
import type { Invoice } from "@/lib/api";
import { cn } from "@/lib/utils";

function formatXlm(amount: number): string {
  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} XLM`;
}

/**
 * Pipeline stages surfaced on the seller dashboard (issue #313). Mapped
 * directly onto the backend's `Invoice.status` values — there is no
 * separate "submitted" / "under review" status in the current API, so
 * those stages from the issue's original spec aren't representable here
 * without a backend change (see PR description).
 */
const PIPELINE_STAGES: { key: Invoice["status"]; label: string }[] = [
  { key: "draft", label: "Draft" },
  { key: "open", label: "Active" },
  { key: "funded", label: "Funded" },
  { key: "settled", label: "Settled" },
  { key: "rejected", label: "Rejected" },
];

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function InvoiceRowSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-4 w-32 mt-1" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-3 w-full" />
      </CardContent>
    </Card>
  );
}

export function SellerDashboard() {
  const { data, isLoading } = useSellerDashboard();
  const { data: kycStatus } = useSellerKycStatus();
  const wallet = useStellarWallet();
  const [selectedStage, setSelectedStage] = useState<Invoice["status"] | null>(
    null
  );

  if (isLoading || !data) {
    return (
      <div className="space-y-6" data-testid="seller-dashboard-loading" aria-busy="true">
        <ProfileStatsSkeleton />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <InvoiceRowSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  const stageCounts = PIPELINE_STAGES.map((stage) => ({
    ...stage,
    count: data.invoices.filter((invoice) => invoice.status === stage.key)
      .length,
  }));

  const visibleInvoices = selectedStage
    ? data.invoices.filter((invoice) => invoice.status === selectedStage)
    : data.invoices;

  return (
    <div className="space-y-6">
      {kycStatus && (
        <KycStatusBanner
          status={kycStatus.status}
          reason={kycStatus.rejection_reason ?? kycStatus.reason}
        />
      )}

      <OnboardingChecklist
        walletConnected={wallet.isConnected}
        kycStatus={kycStatus?.status ?? null}
        invoiceCount={data.invoices.length}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Earnings Summary</h2>
        <Button asChild size="sm" data-testid="quick-action-submit-invoice">
          <Link href="/seller/publish">Submit New Invoice</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Total Invoices"
          value={data.total_invoices.toString()}
        />
        <StatCard label="Total Funded" value={data.total_funded.toString()} />
        <StatCard label="Total Settled" value={data.total_settled.toString()} />
        <StatCard label="XLM Raised" value={formatXlm(data.total_raised)} />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Pipeline</h2>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Filter invoices by pipeline stage"
        >
          <button
            type="button"
            onClick={() => setSelectedStage(null)}
            aria-pressed={selectedStage === null}
            data-testid="pipeline-stage-all"
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              selectedStage === null
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-background"
            )}
          >
            All ({data.invoices.length})
          </button>
          {stageCounts.map((stage) => (
            <button
              key={stage.key}
              type="button"
              onClick={() => setSelectedStage(stage.key)}
              aria-pressed={selectedStage === stage.key}
              data-testid={`pipeline-stage-${stage.key}`}
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                selectedStage === stage.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background"
              )}
            >
              {stage.label} ({stage.count})
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Invoice Breakdown</h2>
        {data.invoices.length === 0 ? (
          <div
            className="flex flex-col items-center gap-4 py-12 text-center"
            data-testid="seller-invoices-empty"
          >
            <p className="text-muted-foreground">
              No invoices yet — create your first invoice to get started
            </p>
            <Button asChild>
              <Link href="/seller/publish">Create Invoice</Link>
            </Button>
          </div>
        ) : visibleInvoices.length === 0 ? (
          <p
            className="text-sm text-muted-foreground text-center py-8"
            data-testid="seller-invoices-stage-empty"
          >
            No invoices in this stage
          </p>
        ) : (
          visibleInvoices.map((invoice) => (
            <Card key={invoice.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{invoice.title}</h3>
                  <InvoiceStatusBadge status={invoice.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  Face value: {formatXlm(invoice.amount)}
                </p>
              </CardHeader>
              <CardContent>
                {invoice.status === "rejected" && invoice.rejection_reason && (
                  <div
                    className="mb-4 rounded-md border border-red-200 bg-red-50 p-4"
                    data-testid="rejected-banner"
                  >
                    <p className="text-sm text-red-800">
                      This invoice was not approved: {invoice.rejection_reason}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      asChild
                    >
                      <Link href={`/seller/publish?edit=${invoice.id}`}>
                        Edit and Resubmit
                      </Link>
                    </Button>
                  </div>
                )}
                <FundingProgressBar
                  raised={invoice.raised}
                  target={invoice.amount}
                  investorCount={invoice.investor_count}
                />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
