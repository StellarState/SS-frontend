"use client";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useVelocityLimit } from "@/hooks/useVelocityLimit";

interface VelocityMeterProps {
  /** Current investment amount the user is considering. Used to show overage. */
  pendingAmount?: number | null;
}

/**
 * Shows the investor's rolling investment window capacity (#619).
 *
 * Hidden entirely when `limit === null` (no velocity limit for this investor).
 */
export function VelocityMeter({ pendingAmount }: VelocityMeterProps) {
  const { data, isLoading } = useVelocityLimit();

  if (isLoading) {
    return (
      <div className="space-y-2" data-testid="velocity-meter-loading">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-2 w-full" />
      </div>
    );
  }

  // No limit configured for this investor
  if (!data || data.limit === null) return null;

  const effectiveLimit = data.overrideLimit ?? data.limit;
  const committed = data.committed;
  const remaining = Math.max(0, effectiveLimit - committed);
  const pct = effectiveLimit > 0 ? Math.min(100, (committed / effectiveLimit) * 100) : 0;
  const isOverLimit =
    pendingAmount !== null &&
    pendingAmount !== undefined &&
    pendingAmount > remaining;

  // Earliest window expiry
  const nextExpiry =
    data.windowEndTimes.length > 0
      ? new Date(
          data.windowEndTimes.reduce((a, b) =>
            new Date(a).getTime() < new Date(b).getTime() ? a : b
          )
        )
      : null;

  return (
    <div className="space-y-2" data-testid="velocity-meter">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-muted-foreground">
          {data.overrideLimit ? "Custom limit" : "Investment limit"}
        </span>
        <span
          className="tabular-nums"
          data-testid="velocity-remaining"
        >
          {remaining.toLocaleString()} XLM remaining
        </span>
      </div>

      <Progress
        value={pct}
        className={`h-2 ${pct >= 100 ? "[&>div]:bg-destructive" : ""}`}
        data-testid="velocity-progress"
      />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {committed.toLocaleString()} / {effectiveLimit.toLocaleString()} XLM committed
        </span>
        {nextExpiry && (
          <span data-testid="velocity-next-expiry">
            Refreshes{" "}
            {nextExpiry.toLocaleDateString(undefined, { dateStyle: "medium" })}
          </span>
        )}
      </div>

      {isOverLimit && (
        <p
          className="text-sm text-destructive"
          role="alert"
          data-testid="velocity-over-limit"
        >
          Maximum available: {remaining.toLocaleString()} XLM
        </p>
      )}
    </div>
  );
}
