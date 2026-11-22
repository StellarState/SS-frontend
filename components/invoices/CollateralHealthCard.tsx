"use client";
/**
 * Collateral health card for issuer invoice detail (#644).
 *
 * Shows a progress-bar gauge coloured by band (green = safe, yellow = warning,
 * red = critical), required vs posted amounts, and a "Top Up" button.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, ShieldAlert, ShieldOff } from "lucide-react";
import { useCollateralHealth } from "@/hooks/useCollateralHealth";
import { TopUpCollateralModal } from "@/components/invoices/TopUpCollateralModal";

const BAND_STYLES = {
  safe: {
    icon: ShieldCheck,
    color: "text-green-600",
    bar: "bg-green-500",
    label: "Safe",
  },
  warning: {
    icon: ShieldAlert,
    color: "text-yellow-600",
    bar: "bg-yellow-500",
    label: "Warning",
  },
  critical: {
    icon: ShieldOff,
    color: "text-red-600",
    bar: "bg-red-500",
    label: "Critical",
  },
} as const;

interface CollateralHealthCardProps {
  invoiceId: string;
}

export function CollateralHealthCard({ invoiceId }: CollateralHealthCardProps) {
  const { data: health, isLoading, isError } = useCollateralHealth(invoiceId);
  const [topUpOpen, setTopUpOpen] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-4 w-48" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !health) return null;

  const style = BAND_STYLES[health.band];
  const Icon = style.icon;
  const ratioPct = Math.min(100, Math.round(health.ratio * 50));

  return (
    <>
      <Card data-testid="collateral-health-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className={`size-5 ${style.color}`} aria-hidden="true" />
            Collateral health —{" "}
            <span className={`${style.color} font-semibold`}>{style.label}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Ratio</span>
              <span className="font-medium text-foreground">
                {(health.ratio * 100).toFixed(0)}%
              </span>
            </div>
            <Progress
              value={ratioPct}
              className={`h-2 [&>div]:${style.bar}`}
              aria-label={`Collateral ratio ${(health.ratio * 100).toFixed(0)}%`}
            />
          </div>

          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            <span>
              Required:{" "}
              <span className="font-medium text-foreground">
                {health.required.toLocaleString()} XLM
              </span>
            </span>
            <span>
              Posted:{" "}
              <span className="font-medium text-foreground">
                {health.posted.toLocaleString()} XLM
              </span>
            </span>
          </div>

          <Button size="sm" variant="outline" onClick={() => setTopUpOpen(true)}>
            Top Up
          </Button>
        </CardContent>
      </Card>

      <TopUpCollateralModal
        invoiceId={invoiceId}
        health={health}
        open={topUpOpen}
        onOpenChange={setTopUpOpen}
      />
    </>
  );
}
