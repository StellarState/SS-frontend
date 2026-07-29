"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { FundingProgressBar } from "@/components/invoices/FundingProgressBar";
import { useSellerDashboard } from "@/hooks/useSellerDashboard";

function formatXlm(amount: number): string {
  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} XLM`;
}

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

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-20" />
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

  if (isLoading || !data) {
    return (
      <div className="space-y-6" data-testid="seller-dashboard-loading">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <InvoiceRowSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Invoices" value={data.total_invoices.toString()} />
        <StatCard label="Total Funded" value={data.total_funded.toString()} />
        <StatCard label="Total Settled" value={data.total_settled.toString()} />
        <StatCard label="XLM Raised" value={formatXlm(data.total_raised)} />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Invoice Breakdown</h2>
        {data.invoices.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            You haven&apos;t published any invoices yet.
          </p>
        ) : (
          data.invoices.map((invoice) => (
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
