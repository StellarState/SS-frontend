"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchDynamicYield } from "@/lib/api";

export function DynamicYieldCard({ wallet, invoiceRate }: { wallet: string; invoiceRate?: number | null }) {
  const query = useQuery({ queryKey: ["dynamic-yield", wallet], queryFn: () => fetchDynamicYield(wallet), enabled: Boolean(wallet) });
  const data = query.data;
  if (query.isLoading || query.isError || !data) return null;
  const aboveBase = data.current_rate >= data.base_rate;
  return <Card data-testid="dynamic-yield-card"><CardHeader className="pb-2"><CardTitle className="text-base">Current adjusted yield</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><div className={`text-lg font-semibold ${aboveBase ? "text-green-700" : "text-amber-700"}`} title="Rate adjusted from the issuer base rate using settlement history">{data.current_rate.toFixed(2)}% <span className="text-xs font-normal">current issuer rate</span></div><p className="text-muted-foreground">Base rate {data.base_rate.toFixed(2)}% · {data.settlement_count} on-time settlements</p>{invoiceRate != null && <p className="text-xs text-muted-foreground">This invoice was priced at {invoiceRate.toFixed(2)}%.</p>}{data.adjustment_history.length > 0 && <div><p className="text-xs font-medium text-muted-foreground">Recent rate history</p><ul className="flex gap-2 overflow-x-auto pt-1" aria-label="Yield adjustment history">{data.adjustment_history.slice(-10).map((item) => <li key={`${item.effective_at}-${item.rate}`} title={`${new Date(item.effective_at).toLocaleDateString()}${item.reason ? ` — ${item.reason}` : ""}`} className="rounded border px-2 py-1 text-xs">{item.rate.toFixed(2)}%</li>)}</ul></div>}</CardContent></Card>;
}
