"use client";

/**
 * Admin protocol revenue dashboard with fee breakdown and trends (#772)
 */

import { useState } from "react";
import { useRevenueStats } from "@/hooks/useRevenueStats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Calendar } from "lucide-react";
import { Money } from "@/components/currency";

function RevenueDashboard() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // last 30 days
    endDate: new Date(),
  });

  const { data, isLoading, error } = useRevenueStats(dateRange);

  const handleDateChange = (days: number) => {
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    setDateRange({ startDate: start, endDate: end });
  };

  const handleExportCSV = () => {
    if (!data) return;

    const rows = [
      ["Revenue Dashboard Export", dateRange.startDate.toISOString().split("T")[0]],
      [],
      ["Metric", "Value"],
      ["Total Revenue", data.totalRevenue],
      ["Take Rate", `${data.takeRate.toFixed(2)}%`],
      ["Average Invoice Fee", data.avgInvoiceFee],
      ["Invoice Count", data.invoiceCount],
      ["Volume Count", data.volumeCount],
      ["Change vs Previous Period", `${data.changePercentage.toFixed(2)}%`],
      [],
      ["Fee Type", "Amount", "Percentage"],
      ...data.feesByType.map((f) => [f.type, f.amount, `${f.percentage.toFixed(2)}%`]),
      [],
      ["Top Issuers", "Fees Generated"],
      ...data.topIssuers.map((i) => [i.name, i.fees]),
      [],
      ["Top Investors", "Fees Generated"],
      ...data.topInvestors.map((i) => [i.name, i.fees]),
    ];

    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `revenue-${dateRange.startDate.getTime()}-${dateRange.endDate.getTime()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!data && !isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-muted-foreground">
          No data available for the selected period
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-red-600">Failed to load revenue data</div>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Revenue Dashboard</h1>
          <Button onClick={handleExportCSV} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleDateChange(7)}
            className="gap-2"
          >
            <Calendar className="h-4 w-4" />
            Last 7 days
          </Button>
          <Button
            variant="outline"
            onClick={() => handleDateChange(30)}
            className="gap-2"
          >
            <Calendar className="h-4 w-4" />
            Last 30 days
          </Button>
          <Button
            variant="outline"
            onClick={() => handleDateChange(90)}
            className="gap-2"
          >
            <Calendar className="h-4 w-4" />
            Last 90 days
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Money amount={data.totalRevenue} decimals={0} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.changePercentage >= 0 ? "+" : ""}
              {data.changePercentage.toFixed(1)}% vs previous period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Take Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.takeRate.toFixed(2)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Invoice Fee
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Money amount={data.avgInvoiceFee} decimals={2} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Invoice Count
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.invoiceCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Fees by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.feesByType.map((fee) => (
                <div key={fee.type} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium capitalize">{fee.type}</div>
                    <div className="text-sm text-muted-foreground">
                      {fee.percentage.toFixed(1)}%
                    </div>
                  </div>
                  <div className="font-semibold">
                    <Money amount={fee.amount} decimals={0} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between font-semibold">
                <div>Total</div>
                <div>
                  <Money amount={data.totalRevenue} decimals={0} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fee Chart Placeholder</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted rounded flex items-center justify-center">
              <div className="text-muted-foreground">
                Stacked area chart of fees by type over time
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Issuers by Fees Generated</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4 font-medium">Issuer</th>
                  <th className="text-right py-2 px-4 font-medium">Fees</th>
                </tr>
              </thead>
              <tbody>
                {data.topIssuers.map((issuer) => (
                  <tr key={issuer.name} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-4">{issuer.name}</td>
                    <td className="text-right py-2 px-4">
                      <Money amount={issuer.fees} decimals={0} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Top Investors by Fees Generated</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4 font-medium">Investor</th>
                  <th className="text-right py-2 px-4 font-medium">Fees</th>
                </tr>
              </thead>
              <tbody>
                {data.topInvestors.map((investor) => (
                  <tr key={investor.name} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-4">{investor.name}</td>
                    <td className="text-right py-2 px-4">
                      <Money amount={investor.fees} decimals={0} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export default RevenueDashboard;
