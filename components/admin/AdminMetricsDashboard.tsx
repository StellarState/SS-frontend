"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface PlatformMetrics { totalInvoices: number; totalFunded: number; activeInvestors: number; settlementRate: number; statusBreakdown: Record<string, number>; recentActivity: { id: string; type: string; description: string; timestamp: string }[]; }

function SummaryCard({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) {
  return (<Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{value}</p>{subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}</CardContent></Card>);
}

function StatusChart({ breakdown }: { breakdown: Record<string, number> }) {
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0) || 1;
  const colors: Record<string, string> = { submitted: "bg-blue-500", active: "bg-amber-500", funded: "bg-green-500", settled: "bg-emerald-700", rejected: "bg-red-500", expired: "bg-gray-400" };
  return (
    <Card><CardHeader><CardTitle className="text-sm font-medium">Invoice Status Breakdown</CardTitle></CardHeader><CardContent className="space-y-3">
      <div className="flex h-4 w-full overflow-hidden rounded-full">{Object.entries(breakdown).map(([s, c]) => <div key={s} className={`${colors[s] ?? "bg-gray-300"} h-full`} style={{ width: `${(c / total) * 100}%` }} title={`${s}: ${c}`} />)}</div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">{Object.entries(breakdown).map(([s, c]) => <div key={s} className="flex items-center gap-1"><div className={`h-2.5 w-2.5 rounded-full ${colors[s] ?? "bg-gray-300"}`} /><span className="capitalize">{s}</span><span className="font-medium text-foreground">{c}</span></div>)}</div>
    </CardContent></Card>
  );
}

function exportCsv(data: PlatformMetrics, range: string) {
  const rows = [["Metric", "Value"], ["Total Invoices", data.totalInvoices], ["Total Funded", data.totalFunded], ["Active Investors", data.activeInvestors], ["Settlement Rate", `${data.settlementRate}%`], [""], ["Status", "Count"], ...Object.entries(data.statusBreakdown)];
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `metrics-${range}.csv`; a.click(); URL.revokeObjectURL(url);
}

export function AdminMetricsDashboard() {
  const [range, setRange] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const { data, isLoading } = useQuery<PlatformMetrics>({ queryKey: ["admin-metrics", range], queryFn: async () => { const res = await fetch(`/api/admin/metrics?range=${range}`); if (!res.ok) throw new Error("Failed"); return res.json(); } });
  if (isLoading) return <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Card key={i} className="h-28 animate-pulse bg-muted" />)}</div>;
  const m = data ?? { totalInvoices: 0, totalFunded: 0, activeInvestors: 0, settlementRate: 0, statusBreakdown: {}, recentActivity: [] };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Platform Metrics</h2><div className="flex items-center gap-2"><div className="flex rounded-md border">{(["7d", "30d", "90d", "all"] as const).map((r) => <button key={r} onClick={() => setRange(r)} className={`px-3 py-1 text-xs font-medium ${range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>{r === "all" ? "All" : r}</button>)}</div><Button variant="outline" size="sm" onClick={() => data && exportCsv(data, range)}>Export CSV</Button></div></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4"><SummaryCard title="Total Invoices" value={m.totalInvoices} /><SummaryCard title="Total Funded" value={`${m.totalFunded.toLocaleString()} XLM`} /><SummaryCard title="Active Investors" value={m.activeInvestors} /><SummaryCard title="Settlement Rate" value={`${m.settlementRate}%`} /></div>
      <StatusChart breakdown={m.statusBreakdown} />
      <Card><CardHeader><CardTitle className="text-sm font-medium">Recent Activity</CardTitle></CardHeader><CardContent>{m.recentActivity.length === 0 ? <p className="text-sm text-muted-foreground">No recent activity</p> : <ul className="space-y-3">{m.recentActivity.map((ev) => <li key={ev.id} className="flex items-start gap-3 text-sm"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" /><div><p>{ev.description}</p><p className="text-xs text-muted-foreground">{new Date(ev.timestamp).toLocaleString()}</p></div></li>)}</ul>}</CardContent></Card>
    </div>
  );
}
