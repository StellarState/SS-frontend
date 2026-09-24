"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface PlatformMetrics {
  totalInvoices: number;
  totalFunded: number;
  activeInvestors: number;
  settlementRate: number;
  statusBreakdown: Record<string, number>;
  recentActivity: ActivityEvent[];
}

interface ActivityEvent {
  id: string;
  type: string;
  description: string;
  timestamp: string;
}

function SummaryCard({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function StatusChart({ breakdown }: { breakdown: Record<string, number> }) {
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0) || 1;
  const colors: Record<string, string> = {
    submitted: "bg-blue-500",
    active: "bg-amber-500",
    funded: "bg-green-500",
    settled: "bg-emerald-700",
    rejected: "bg-red-500",
    expired: "bg-gray-400",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Invoice Status Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Horizontal stacked bar */}
        <div className="flex h-4 w-full overflow-hidden rounded-full">
          {Object.entries(breakdown).map(([status, count]) => (
            <div
              key={status}
              className={`${colors[status] ?? "bg-gray-300"} h-full`}
              style={{ width: `${(count / total) * 100}%` }}
              title={`${status}: ${count}`}
            />
          ))}
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {Object.entries(breakdown).map(([status, count]) => (
            <div key={status} className="flex items-center gap-1">
              <div className={`h-2.5 w-2.5 rounded-full ${colors[status] ?? "bg-gray-300"}`} />
              <span className="capitalize">{status}</span>
              <span className="font-medium text-foreground">{count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity</p>
        ) : (
          <ul className="space-y-3">
            {events.map((ev) => (
              <li key={ev.id} className="flex items-start gap-3 text-sm">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div>
                  <p>{ev.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(ev.timestamp).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function exportCsv(data: PlatformMetrics, dateRange: string) {
  const rows = [
    ["Metric", "Value"],
    ["Total Invoices", data.totalInvoices],
    ["Total Funded", data.totalFunded],
    ["Active Investors", data.activeInvestors],
    ["Settlement Rate", `${data.settlementRate}%`],
    [""],
    ["Status", "Count"],
    ...Object.entries(data.statusBreakdown).map(([k, v]) => [k, v]),
  ];
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `metrics-${dateRange}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * #288 — Admin dashboard with platform-wide metrics.
 * Summary cards, status breakdown chart, activity feed, date range filter, CSV export.
 */
export function AdminMetricsDashboard() {
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "all">("30d");

  const { data, isLoading } = useQuery<PlatformMetrics>({
    queryKey: ["admin-metrics", dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/admin/metrics?range=${dateRange}`);
      if (!res.ok) throw new Error("Failed to fetch metrics");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-28 animate-pulse bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const metrics: PlatformMetrics = data ?? {
    totalInvoices: 0,
    totalFunded: 0,
    activeInvestors: 0,
    settlementRate: 0,
    statusBreakdown: {},
    recentActivity: [],
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Platform Metrics</h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border">
            {(["7d", "30d", "90d", "all"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1 text-xs font-medium ${
                  dateRange === range ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {range === "all" ? "All" : range}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => data && exportCsv(data, dateRange)}>
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard title="Total Invoices" value={metrics.totalInvoices} />
        <SummaryCard title="Total Funded" value={`${metrics.totalFunded.toLocaleString()} XLM`} />
        <SummaryCard title="Active Investors" value={metrics.activeInvestors} />
        <SummaryCard title="Settlement Rate" value={`${metrics.settlementRate}%`} />
      </div>

      {/* Status breakdown */}
      <StatusChart breakdown={metrics.statusBreakdown} />

      {/* Activity feed */}
      <ActivityFeed events={metrics.recentActivity} />
    </div>
  );
}
