"use client";

/**
 * Order book depth chart for the invoice detail secondary market section (#503).
 *
 * Cumulative open buy orders (bids, green) and listings (asks, red) by price,
 * with the mid-price marked. Refreshes every 30 seconds via useInvoiceOrderBook.
 */

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvoiceOrderBook } from "@/hooks/useInvoiceOrderBook";
import { useChartPalette } from "@/hooks/useChartPalette";
import { buildDepthData, midPrice, type DepthPoint } from "@/lib/orderBook";

const BID_COLOR = "#16a34a";
const ASK_COLOR = "#dc2626";

function formatPrice(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function DepthTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: DepthPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const isBid = point.bidDepth !== null;
  return (
    <div
      className="rounded-md border bg-popover px-3 py-2 text-xs shadow-sm"
      data-testid="orderbook-tooltip"
    >
      <p className="font-medium">{formatPrice(point.price)} XLM</p>
      <p className="text-muted-foreground">
        {isBid ? "Bids" : "Asks"}: {(isBid ? point.bidDepth : point.askDepth)?.toLocaleString()}{" "}
        fractions
      </p>
    </div>
  );
}

export function OrderBookDepthChart({ invoiceId }: { invoiceId: string }) {
  const { data, isLoading, isError } = useInvoiceOrderBook(invoiceId);
  const [bidCue, askCue] = useChartPalette(2);

  const depth = useMemo(() => (data ? buildDepthData(data) : []), [data]);
  const mid = useMemo(() => (data ? midPrice(data) : null), [data]);

  return (
    <Card data-testid="orderbook-card">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Secondary market depth</h2>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: BID_COLOR }} />
              Buy orders
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: ASK_COLOR }} />
              Listings
            </span>
            {mid !== null && (
              <span data-testid="orderbook-mid-price">Mid {formatPrice(mid)} XLM</span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-56 w-full" data-testid="orderbook-loading" />
        ) : isError ? (
          <p className="text-sm text-muted-foreground" data-testid="orderbook-error">
            The order book is unavailable right now. It will retry automatically.
          </p>
        ) : depth.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="orderbook-empty">
            No open buy orders or listings yet.
          </p>
        ) : (
          <div className="h-56 w-full sm:h-72" data-testid="orderbook-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={depth} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="price"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={formatPrice}
                  tick={{ fontSize: 11 }}
                  tickCount={5}
                  minTickGap={24}
                />
                <YAxis tick={{ fontSize: 11 }} width={44} allowDecimals={false} />
                <Tooltip content={<DepthTooltip />} />
                <Area
                  type="stepAfter"
                  dataKey="bidDepth"
                  stroke={BID_COLOR}
                  strokeDasharray={bidCue.dash}
                  fill={BID_COLOR}
                  fillOpacity={0.25}
                  isAnimationActive={false}
                  connectNulls={false}
                />
                <Area
                  type="stepBefore"
                  dataKey="askDepth"
                  stroke={ASK_COLOR}
                  strokeDasharray={askCue.dash}
                  fill={ASK_COLOR}
                  fillOpacity={0.25}
                  isAnimationActive={false}
                  connectNulls={false}
                />
                {mid !== null && (
                  <ReferenceLine
                    x={mid}
                    stroke="currentColor"
                    strokeDasharray="4 3"
                    label={{ value: "Mid", position: "top", fontSize: 11 }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
