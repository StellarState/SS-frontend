"use client";

import { useState } from "react";
import { AlertCircle, AlertTriangle, ArrowRight, Check, ShieldAlert, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type {
  AlternativeAsset,
  ExposureEvaluationResult,
} from "@/lib/analytics/exposureLimits";

export interface LeveragedExposureWarningProps {
  evaluation: ExposureEvaluationResult;
  onDismissSoftWarning?: () => void;
  isDismissed?: boolean;
  onSelectAlternative?: (alt: AlternativeAsset) => void;
}

export function LeveragedExposureWarning({
  evaluation,
  onDismissSoftWarning,
  isDismissed = false,
  onSelectAlternative,
}: LeveragedExposureWarningProps) {
  const [localDismissed, setLocalDismissed] = useState(false);
  const dismissed = isDismissed || localDismissed;

  const handleDismiss = () => {
    setLocalDismissed(true);
    onDismissSoftWarning?.();
  };

  const { isHardBlocked, requiresWarning, hardBreaches, softBreaches, dimensions, qualifiedAlternatives } =
    evaluation;

  return (
    <div className="space-y-4" data-testid="leveraged-exposure-warning-container">
      {/* Hard Block Alert: Cannot proceed */}
      {isHardBlocked && (
        <div
          className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive dark:border-destructive/60 dark:bg-destructive/20"
          role="alert"
          data-testid="hard-block-alert"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <h4 className="font-semibold text-sm">Transaction Blocked: Hard Exposure Limit Breached</h4>
              <p className="text-xs text-destructive/90">
                This leveraged order breaches the maximum hard concentration limit across the following dimensions:
              </p>
              <ul className="list-disc pl-5 text-xs font-medium space-y-1" data-testid="hard-breach-dimensions">
                {hardBreaches.map((b) => (
                  <li key={`${b.dimension}-${b.key}`}>
                    <span className="capitalize">{b.dimension}</span>: <strong>{b.label}</strong> resulting in{" "}
                    <span className="tabular-nums font-bold">{b.resultingPercent}%</span> utilisation (limit:{" "}
                    {b.limitPercent}%).
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Soft Warning Alert: Dismissible */}
      {requiresWarning && !isHardBlocked && (
        <div
          className={`rounded-lg border p-4 transition-all ${
            dismissed
              ? "border-muted bg-muted/30 text-muted-foreground"
              : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
          }`}
          role="region"
          aria-label="Soft exposure warning"
          data-testid="soft-warning-alert"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${dismissed ? "text-muted-foreground" : "text-amber-600 dark:text-amber-400"}`} />
              <div className="space-y-1">
                <h4 className="font-semibold text-sm">
                  {dismissed ? "Exposure Warning Acknowledged" : "Concentration Warning: Soft Limit Exceeded"}
                </h4>
                <p className="text-xs">
                  Resulting allocation exceeds optimal diversification thresholds:
                </p>
                <ul className="list-disc pl-5 text-xs font-medium space-y-0.5" data-testid="soft-breach-dimensions">
                  {softBreaches.map((b) => (
                    <li key={`${b.dimension}-${b.key}`}>
                      <span className="capitalize">{b.dimension}</span>: <strong>{b.label}</strong> increases to{" "}
                      <span className="tabular-nums font-bold">{b.resultingPercent}%</span> (threshold: {b.limitPercent}%).
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {!dismissed && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleDismiss}
                className="shrink-0 text-xs border-amber-300 hover:bg-amber-100 dark:border-amber-800 dark:hover:bg-amber-900/40"
                data-testid="dismiss-soft-warning-btn"
              >
                <Check className="h-3.5 w-3.5 mr-1" /> Dismiss &amp; Proceed
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Utilisation Gauges: Current vs Resulting */}
      <Card data-testid="exposure-utilisation-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Portfolio Exposure &amp; Utilisation</CardTitle>
          <CardDescription className="text-xs">
            Concentration breakdown across issuer, debtor, and jurisdiction dimensions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {dimensions.map((dim) => (
            <div key={dim.dimension} className="space-y-1.5" data-testid={`dimension-utilisation-${dim.dimension}`}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium capitalize">
                  {dim.dimension}: <span className="text-foreground font-semibold">{dim.label}</span>
                </span>
                <span className="tabular-nums text-muted-foreground">
                  Current: {dim.currentPercent}% →{" "}
                  <strong
                    className={
                      dim.isHardBreach
                        ? "text-destructive font-bold"
                        : dim.isSoftBreach
                          ? "text-amber-600 dark:text-amber-400 font-bold"
                          : "text-foreground font-medium"
                    }
                  >
                    Resulting: {dim.resultingPercent}%
                  </strong>
                </span>
              </div>
              <Progress
                value={Math.min(100, dim.resultingPercent)}
                className={`h-2 ${dim.isHardBreach ? "[&>div]:bg-destructive" : dim.isSoftBreach ? "[&>div]:bg-amber-500" : ""}`}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Lower-Risk Alternatives Section */}
      {qualifiedAlternatives.length > 0 && (
        <Card className="border-primary/20 bg-primary/5" data-testid="exposure-alternatives-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">Recommended Lower-Risk Alternatives</CardTitle>
            </div>
            <CardDescription className="text-xs">
              These verified assets keep your portfolio well within exposure limits (&le; 25% concentration).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2" data-testid="exposure-alternatives-list">
              {qualifiedAlternatives.slice(0, 4).map((alt) => (
                <div
                  key={alt.id}
                  className="flex items-center justify-between rounded-lg border bg-card p-3 text-xs"
                  data-testid={`alt-asset-${alt.id}`}
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold text-foreground">{alt.title}</p>
                    <p className="text-muted-foreground">
                      {alt.jurisdiction} · {alt.yieldPercent}% APY · Tier {alt.riskTier}
                    </p>
                    <Badge variant="outline" className="text-[10px] font-normal text-emerald-600 border-emerald-300">
                      Safe Resulting Exposure: {alt.resultingPercent}%
                    </Badge>
                  </div>
                  {onSelectAlternative && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1 text-primary hover:text-primary"
                      onClick={() => onSelectAlternative(alt)}
                      data-testid={`select-alt-${alt.id}`}
                    >
                      Swap <ArrowRight className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
