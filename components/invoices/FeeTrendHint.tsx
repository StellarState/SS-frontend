"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import type { ExitPreview } from "@/lib/api";

/** Whether the exit fee is about to rise or fall, and when (#593). */
export function FeeTrendHint({ preview }: { preview: ExitPreview }) {
  if (preview.fee_waived) return null;

  const at = preview.next_change_at ? new Date(preview.next_change_at) : null;
  const when = at && Number.isFinite(at.getTime()) && at.getTime() > Date.now()
    ? `in ${formatDistanceToNowStrict(at)}`
    : null;
  const next =
    preview.next_fee_percent != null
      ? `${preview.next_fee_percent.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`
      : null;

  if (preview.trend === "flat" || !next) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="fee-trend-hint" data-trend="flat">
        <Minus className="h-3.5 w-3.5" />
        The exit fee is not scheduled to change.
      </p>
    );
  }

  const rising = preview.trend === "rising";
  const Icon = rising ? TrendingUp : TrendingDown;
  return (
    <p
      className={`flex items-center gap-1.5 text-xs ${rising ? "text-amber-700 dark:text-amber-400" : "text-green-700 dark:text-green-400"}`}
      data-testid="fee-trend-hint"
      data-trend={preview.trend}
    >
      <Icon className="h-3.5 w-3.5" />
      Fee {rising ? "rises" : "falls"} to {next}
      {when ? ` ${when}` : ""}
      {at && Number.isFinite(at.getTime()) && (
        <span className="text-muted-foreground"> ({at.toLocaleString()})</span>
      )}
      .
    </p>
  );
}
