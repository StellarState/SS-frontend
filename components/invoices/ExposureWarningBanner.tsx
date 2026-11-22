"use client";

import Link from "next/link";
import { AlertCircle, AlertTriangle, ArrowRight, ShieldAlert, Sparkles, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ExposureEvaluation } from "@/lib/analytics/exposureLimits";

export interface ExposureWarningBannerProps {
  evaluation: ExposureEvaluation;
  isDismissed?: boolean;
  onDismiss?: () => void;
}

export function ExposureWarningBanner({
  evaluation,
  isDismissed = false,
  onDismiss,
}: ExposureWarningBannerProps) {
  const {
    isHardBlocked,
    hasSoftWarning,
    breachedHardDimensions,
    breachedSoftDimensions,
    alternativeRecommendations,
  } = evaluation;

  // If hard blocked, hard warning is ALWAYS displayed (cannot be dismissed)
  if (isHardBlocked) {
    return (
      <div className="space-y-3" data-testid="hard-exposure-block" role="alert">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive dark:text-red-400 space-y-2">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 flex-shrink-0 mt-0.5 text-destructive" />
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">Investment Blocked: Concentration Cap Breached</p>
                <Badge variant="destructive" className="text-xs">
                  HARD BLOCK
                </Badge>
              </div>
              <p className="text-xs opacity-90">
                Adding this investment would breach your portfolio concentration limit (maximum{" "}
                {breachedHardDimensions[0]?.hardLimitPercent ?? 40}% allowed per dimension).
              </p>

              {/* Breached Dimensions List */}
              <div className="pt-2 space-y-1.5" data-testid="breached-dimensions-list">
                {breachedHardDimensions.map((dim) => (
                  <div
                    key={dim.dimension}
                    className="flex flex-col sm:flex-row sm:items-center justify-between rounded bg-destructive/15 px-2.5 py-1.5 text-xs font-medium"
                    data-testid={`breached-dimension-${dim.dimension}`}
                  >
                    <span className="capitalize">
                      {dim.dimension}: <span className="font-bold text-foreground">{dim.dimensionKey}</span>
                    </span>
                    <span className="tabular-nums">
                      Utilisation: {dim.currentSharePercent}% →{" "}
                      <span className="font-bold underline text-destructive">{dim.resultingSharePercent}%</span>{" "}
                      (Cap: {dim.hardLimitPercent}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Lower-Risk Alternatives That Respect Limits */}
        {alternativeRecommendations.length > 0 && (
          <Card className="border-border/60 bg-muted/20" data-testid="exposure-alternatives-card">
            <CardHeader className="py-2.5 px-3">
              <CardTitle className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>Lower-Risk Alternatives Respecting Your Limits</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0">
              <p className="text-[11px] text-muted-foreground pb-2">
                Diversify without breaching concentration limits with these active marketplace opportunities:
              </p>
              <div className="divide-y divide-border/40 text-xs">
                {alternativeRecommendations.slice(0, 3).map((alt) => (
                  <div
                    key={alt.id}
                    className="flex items-center justify-between py-2"
                    data-testid={`alternative-option-${alt.id}`}
                  >
                    <div>
                      <p className="font-medium">{alt.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {alt.jurisdiction} • {alt.yield_rate}% Yield
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" asChild className="h-7 text-xs gap-1">
                      <Link href={`/marketplace/${alt.id}`} data-testid={`view-alt-${alt.id}`}>
                        <span>View</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Soft warning (dismissible)
  if (hasSoftWarning && !isDismissed) {
    return (
      <div
        className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3.5 text-amber-700 dark:text-amber-400 space-y-2"
        data-testid="soft-exposure-warning"
        role="alert"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-600" />
            <div className="space-y-1">
              <p className="font-semibold text-xs">High Concentration Notice</p>
              <p className="text-[11px] opacity-90">
                This investment approaches concentration guidelines (soft limit of{" "}
                {breachedSoftDimensions[0]?.softLimitPercent ?? 25}%).
              </p>
              <div className="space-y-1 pt-1">
                {breachedSoftDimensions.map((dim) => (
                  <p key={dim.dimension} className="text-[11px]">
                    <span className="capitalize font-medium">{dim.dimension}</span> ({dim.dimensionKey}):{" "}
                    <span className="font-bold tabular-nums">
                      {dim.currentSharePercent}% → {dim.resultingSharePercent}%
                    </span>
                  </p>
                ))}
              </div>
            </div>
          </div>

          {onDismiss && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDismiss}
              className="h-6 w-6 text-amber-700 hover:bg-amber-500/20"
              data-testid="dismiss-soft-warning-btn"
              aria-label="Dismiss concentration warning"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
