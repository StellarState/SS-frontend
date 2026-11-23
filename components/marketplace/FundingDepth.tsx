"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvoiceFundingDepth } from "@/hooks/useInvoiceFundingDepth";
import { formatFundingDepthAmount, normalizeFundingDepth } from "@/lib/fundingDepth";

export function FundingDepth({ invoiceId, compact = false }: { invoiceId: string; compact?: boolean }) {
  const { data, isLoading, isError } = useInvoiceFundingDepth(invoiceId);
  const levels = useMemo(() => data ? normalizeFundingDepth(data) : [], [data]);
  const chartLevels = useMemo(() => levels.filter((level) => level.estimatedHours !== null), [levels]);

  if (!data || !data.live || levels.length === 0) return null;
  const updated = new Date(data.updatedAt);
  const stale = Number.isNaN(updated.getTime()) || Date.now() - updated.getTime() > 60_000;
  const lastUpdated = Number.isNaN(updated.getTime()) ? "unknown" : updated.toLocaleTimeString();
  const total = levels[levels.length - 1].committed;

  if (compact) {
    return <p className="text-xs text-muted-foreground" data-testid={`funding-depth-compact-${invoiceId}`}>
      Funding depth {formatFundingDepthAmount(total)}{stale ? ` · Updated ${lastUpdated}` : " · Live"}
    </p>;
  }

  return <Card data-testid="funding-depth-card">
    <CardHeader className="space-y-1">
      <h2 className="text-lg font-semibold">Funding depth</h2>
      <p className="text-sm text-muted-foreground">Indicative committed amount at each estimated fill point.</p>
    </CardHeader>
    <CardContent className="space-y-4">
      {isLoading ? <Skeleton className="h-48 w-full" data-testid="funding-depth-loading" /> : isError ? (
        <p role="status" className="text-sm text-muted-foreground">Funding depth is temporarily unavailable.</p>
      ) : <>
        {chartLevels.length > 0 ? <div className="h-48 w-full" aria-label="Cumulative funding depth chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartLevels}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="estimatedHours" type="number" name="Estimated fill time" tickFormatter={(n: number) => `${n}h`} />
              <YAxis tickFormatter={(n: number) => n.toLocaleString()} />
              <Tooltip labelFormatter={(label) => `Estimated fill: ${label} hours`} formatter={(value) => formatFundingDepthAmount(Number(value))} />
              <Area type="stepAfter" dataKey="committed" name="Committed" stroke="#2563eb" fill="#2563eb" fillOpacity={0.2} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div> : <p className="text-sm text-muted-foreground">Estimated fill time is unavailable for charting.</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Funding fill estimates">
            <thead><tr className="border-b text-left"><th className="py-2 pr-4">Committed</th><th className="py-2">Estimated fill</th></tr></thead>
            <tbody>{levels.map((level, index) => <tr key={`${level.committed}-${index}`} className="border-b last:border-0">
              <td className="py-2 pr-4">{formatFundingDepthAmount(level.committed)}</td>
              <td className="py-2">{level.estimatedHours === null ? "Unavailable" : `${level.estimatedHours.toLocaleString()} hours`}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground" role="status">
          {stale ? `Stale data · Last updated ${lastUpdated}` : `Indicative · Updated ${lastUpdated}`}
        </p>
      </>}
    </CardContent>
  </Card>;
}
