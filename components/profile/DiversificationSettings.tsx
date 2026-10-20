"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, PieChart as PieChartIcon, ShieldCheck } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useWallet } from "@/context/WalletContext";
import { useDiversificationLimit, useSetDiversificationLimitMutation } from "@/hooks/useDiversification";
import { usePortfolio } from "@/hooks/usePortfolio";
import {
  MAX_DIVERSIFICATION_LIMIT_PCT,
  MIN_DIVERSIFICATION_LIMIT_PCT,
  buildConcentration,
  getConcentrationStatus,
  resolveDiversificationLimit,
  validateDiversificationLimit,
} from "@/lib/diversification";
import { formatXLM } from "@/lib/format";

const SLICE_COLORS = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#a855f7",
  "#ec4899",
  "#84cc16",
];

export function DiversificationSettings() {
  const { address, isConnected } = useWallet();
  const { data, isLoading, isError } = useDiversificationLimit(address);
  const { data: portfolio } = usePortfolio();
  const saveMutation = useSetDiversificationLimitMutation();

  const configuredLimit = resolveDiversificationLimit(data?.limit_pct);
  // `null` means "not edited yet" — the input then shows the stored limit.
  // An empty string is a real (invalid) edit and must not fall back.
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep the input in step with the stored limit until the investor edits it.
  useEffect(() => {
    setDraft(null);
    setError(null);
  }, [configuredLimit]);

  const inputValue = draft ?? String(configuredLimit);
  const concentration = useMemo(
    () => buildConcentration(portfolio?.positions ?? []),
    [portfolio?.positions],
  );

  if (!isConnected) {
    return (
      <Card data-testid="diversification-settings">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground" data-testid="diversification-connect">
            Connect a wallet to manage your diversification limit.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleSave = () => {
    const parsed = Number(inputValue);
    const validationError = validateDiversificationLimit(parsed);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    saveMutation.mutate({ wallet: address as string, limitPct: parsed });
  };

  const breached = concentration.filter(
    (slice) => getConcentrationStatus(slice.share_percent, configuredLimit) === "breached",
  );

  return (
    <Card data-testid="diversification-settings">
      <CardHeader>
        <CardTitle className="text-base">Diversification settings</CardTitle>
        <CardDescription>
          Cap how much of your portfolio a single invoice can hold.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : isError ? (
          <p className="text-sm text-destructive" role="alert" data-testid="diversification-error">
            Could not load your diversification limit.
          </p>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="diversification-limit">Single-invoice concentration limit</Label>
            <div className="flex items-start gap-3">
              <div className="flex items-center gap-2">
                <Input
                  id="diversification-limit"
                  type="number"
                  inputMode="numeric"
                  min={MIN_DIVERSIFICATION_LIMIT_PCT}
                  max={MAX_DIVERSIFICATION_LIMIT_PCT}
                  step={1}
                  value={inputValue}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    setError(null);
                  }}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "diversification-limit-error" : "diversification-limit-hint"}
                  className="w-28"
                  data-testid="diversification-limit-input"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saveMutation.isPending}
                data-testid="diversification-limit-save"
              >
                {saveMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                Save
              </Button>
            </div>
            {error ? (
              <p
                id="diversification-limit-error"
                className="text-sm text-destructive"
                role="alert"
                data-testid="diversification-limit-error"
              >
                {error}
              </p>
            ) : (
              <p id="diversification-limit-hint" className="text-xs text-muted-foreground">
                Between {MIN_DIVERSIFICATION_LIMIT_PCT}% and {MAX_DIVERSIFICATION_LIMIT_PCT}%.
                {data?.limit_pct === null || data?.limit_pct === undefined
                  ? ` Using the default of ${configuredLimit}% until you save a custom limit.`
                  : ""}
              </p>
            )}
            <p className="text-xs text-muted-foreground" data-testid="diversification-current-limit">
              Current limit: <span className="font-medium text-foreground tabular-nums">{configuredLimit}%</span>
            </p>
          </div>
        )}

        {breached.length > 0 && (
          <div
            className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40"
            role="status"
            data-testid="diversification-breach-summary"
          >
            <p className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              {breached.length === 1
                ? "1 invoice is over your concentration limit"
                : `${breached.length} invoices are over your concentration limit`}
            </p>
          </div>
        )}

        <div className="space-y-3">
          <h3 className="text-sm font-medium">Current concentration</h3>
          {concentration.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="diversification-empty">
              No active holdings to measure yet.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-[180px_1fr] sm:items-center">
              <div className="h-40 w-full" data-testid="diversification-donut">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={concentration}
                      dataKey="amount"
                      nameKey="invoice_title"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {concentration.map((slice, index) => (
                        <Cell
                          key={slice.invoice_id}
                          fill={SLICE_COLORS[index % SLICE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number | string) => formatXLM(Number(value))}
                      contentStyle={{ fontSize: "0.75rem" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-2" data-testid="diversification-breakdown">
                {concentration.map((slice) => {
                  const status = getConcentrationStatus(slice.share_percent, configuredLimit);
                  return (
                    <li
                      key={slice.invoice_id}
                      className="flex flex-wrap items-center justify-between gap-2 text-sm"
                      data-testid={`diversification-row-${slice.invoice_id}`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              SLICE_COLORS[
                                concentration.findIndex((c) => c.invoice_id === slice.invoice_id) %
                                  SLICE_COLORS.length
                              ],
                          }}
                          aria-hidden="true"
                        />
                        <span className="truncate">{slice.invoice_title}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="tabular-nums" data-testid={`diversification-share-${slice.invoice_id}`}>
                          {slice.share_percent.toFixed(1)}%
                        </span>
                        {status === "breached" ? (
                          <Badge variant="destructive" data-testid={`diversification-breach-${slice.invoice_id}`}>
                            <AlertTriangle aria-hidden="true" />
                            Over limit
                          </Badge>
                        ) : status === "near" ? (
                          <Badge variant="outline" data-testid={`diversification-near-${slice.invoice_id}`}>
                            Near limit
                          </Badge>
                        ) : (
                          <ShieldCheck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {concentration.length > 0 && breached.length === 0 && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground" data-testid="diversification-within-limit">
            <PieChartIcon className="h-3.5 w-3.5" aria-hidden="true" />
            Every invoice is within your {configuredLimit}% concentration limit.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
